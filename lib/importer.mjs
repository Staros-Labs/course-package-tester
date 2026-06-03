import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { findLaunchCandidates } from "./manifest.mjs";

const MAX_FILES = 5000;
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;

function slugify(value) {
  return String(value || "package")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "package";
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function openZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (error, zip) => {
      if (error) reject(error);
      else resolve(zip);
    });
  });
}

export function normalizeZipEntryName(name) {
  const normalized = String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) return "";
  if (/^[a-zA-Z]:/.test(normalized)) return "";
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) return "";
  return parts.join("/");
}

async function collectEntries(zipPath) {
  const zip = await openZip(zipPath);
  const entries = [];
  let fileCount = 0;
  let totalBytes = 0;

  return await new Promise((resolve, reject) => {
    zip.on("error", reject);
    zip.on("entry", (entry) => {
      const normalizedName = normalizeZipEntryName(entry.fileName);
      if (!normalizedName) {
        zip.close();
        reject(new Error(`Unsafe zip entry path: ${entry.fileName}`));
        return;
      }

      if (/\/$/.test(entry.fileName)) {
        entries.push({ entry, name: normalizedName, directory: true });
        zip.readEntry();
        return;
      }

      fileCount += 1;
      totalBytes += entry.uncompressedSize || 0;
      if (fileCount > MAX_FILES) {
        zip.close();
        reject(new Error(`Zip contains too many files. Maximum is ${MAX_FILES}.`));
        return;
      }
      if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        zip.close();
        reject(new Error(`Zip is too large after extraction. Maximum is ${MAX_UNCOMPRESSED_BYTES} bytes.`));
        return;
      }

      entries.push({ entry, name: normalizedName, directory: false });
      zip.readEntry();
    });
    zip.on("end", () => resolve(entries));
    zip.readEntry();
  });
}

function commonSingleWrapper(entries) {
  const topLevels = new Set(
    entries
      .map((item) => item.name.split("/")[0])
      .filter((name) => name && name !== "__MACOSX")
  );
  if (topLevels.size !== 1) return "";
  const [wrapper] = Array.from(topLevels);
  const hasRootFile = entries.some((item) => !item.directory && !item.name.includes("/"));
  return hasRootFile ? "" : wrapper;
}

function stripWrapper(name, wrapper) {
  if (!wrapper) return name;
  return name === wrapper ? "" : name.startsWith(`${wrapper}/`) ? name.slice(wrapper.length + 1) : name;
}

async function extractEntries(zipPath, destination, wrapper) {
  const zip = await openZip(zipPath);

  return await new Promise((resolve, reject) => {
    zip.on("error", reject);
    zip.on("entry", (entry) => {
      const normalizedName = normalizeZipEntryName(entry.fileName);
      const relativeName = stripWrapper(normalizedName, wrapper);
      if (!relativeName) {
        zip.readEntry();
        return;
      }

      const target = path.resolve(destination, relativeName);
      if (!target.startsWith(destination + path.sep) && target !== destination) {
        zip.close();
        reject(new Error(`Unsafe extraction target: ${entry.fileName}`));
        return;
      }

      if (/\/$/.test(entry.fileName)) {
        fs.mkdirSync(target, { recursive: true });
        zip.readEntry();
        return;
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      zip.openReadStream(entry, async (error, stream) => {
        if (error) {
          zip.close();
          reject(error);
          return;
        }
        try {
          await pipeline(stream, fs.createWriteStream(target, { flags: "wx" }));
          zip.readEntry();
        } catch (writeError) {
          zip.close();
          reject(writeError);
        }
      });
    });
    zip.on("end", resolve);
    zip.readEntry();
  });
}

function readExistingImports(importsRoot) {
  if (!fs.existsSync(importsRoot)) return [];
  return fs.readdirSync(importsRoot)
    .map((name) => path.join(importsRoot, name, ".course-package-tester.json"))
    .filter((metadataPath) => fs.existsSync(metadataPath))
    .map((metadataPath) => {
      try {
        return {
          metadataPath,
          directory: path.dirname(metadataPath),
          metadata: JSON.parse(fs.readFileSync(metadataPath, "utf8")),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function importZipPackage({ zipPath, originalFilename, importsRoot, selectedLaunchPath = "" }) {
  fs.mkdirSync(importsRoot, { recursive: true });
  const hash = await sha256File(zipPath);
  const existing = readExistingImports(importsRoot).find((item) => item.metadata.sha256 === hash);
  if (existing) {
    return {
      duplicate: true,
      directory: existing.directory,
      metadata: existing.metadata,
    };
  }

  const entries = await collectEntries(zipPath);
  const wrapper = commonSingleWrapper(entries);
  const folderName = `${slugify(originalFilename)}-${hash.slice(0, 10)}`;
  const finalDir = path.join(importsRoot, folderName);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "course-package-import-"));

  try {
    await extractEntries(zipPath, tempDir, wrapper);
    const candidates = findLaunchCandidates(tempDir);
    if (!candidates.length) {
      throw new Error("The zip does not contain an imsmanifest.xml launch target or an index.html file.");
    }

    const selected = selectedLaunchPath
      ? candidates.find((candidate) => candidate.launchPath === selectedLaunchPath)
      : candidates.find((candidate) => candidate.source === "manifest") || candidates[0];

    if (!selected) {
      return {
        needsLaunchSelection: true,
        candidates,
      };
    }

    if (fs.existsSync(finalDir)) {
      fs.rmSync(finalDir, { recursive: true, force: true });
    }
    fs.renameSync(tempDir, finalDir);

    const metadata = {
      originalFilename,
      importedAt: new Date().toISOString(),
      sha256: hash,
      type: selected.type,
      title: selected.manifest && selected.manifest.title ? selected.manifest.title : originalFilename,
      launchPath: selected.launchPath,
      manifest: selected.manifest || null,
      strippedWrapper: wrapper || "",
      candidateCount: candidates.length,
    };
    fs.writeFileSync(path.join(finalDir, ".course-package-tester.json"), `${JSON.stringify(metadata, null, 2)}\n`);

    return {
      duplicate: false,
      directory: finalDir,
      metadata,
    };
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export function importedCourseIdFromDirectory(importsRoot, directory) {
  return `imports/${path.basename(path.relative(importsRoot, directory) || directory)}`;
}
