import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yazl from "yazl";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(await fsp.readFile(path.join(repoRoot, "package.json"), "utf8"));
const desktopDir = path.join(repoRoot, "dist", "desktop");
const appDirName = "Course Package Tester-win32-x64";
const appDir = path.join(desktopDir, appDirName);
const zipName = `CoursePackageTester_Windows_x64_v${packageJson.version}.zip`;
const zipPath = path.join(desktopDir, zipName);
const checksumPath = `${zipPath}.sha256.txt`;

async function removeDsStoreEntries(targetDir) {
  for (const entry of await fsp.readdir(targetDir, { withFileTypes: true })) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.name === ".DS_Store") {
      await fsp.rm(entryPath, { force: true });
    } else if (entry.isDirectory()) {
      await removeDsStoreEntries(entryPath);
    }
  }
}

async function addDirectory(zip, sourceDir, zipRoot) {
  for (const entry of await fsp.readdir(sourceDir, { withFileTypes: true })) {
    const entryPath = path.join(sourceDir, entry.name);
    const zipEntryPath = path.posix.join(zipRoot, entry.name);
    if (entry.isDirectory()) {
      await addDirectory(zip, entryPath, zipEntryPath);
    } else if (entry.isFile()) {
      zip.addFile(entryPath, zipEntryPath);
    }
  }
}

async function writeZip() {
  await fsp.access(appDir);
  await removeDsStoreEntries(appDir);
  await fsp.rm(zipPath, { force: true });
  await fsp.rm(checksumPath, { force: true });

  const zip = new yazl.ZipFile();
  await addDirectory(zip, appDir, appDirName);
  zip.end();

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    zip.outputStream.pipe(output);
    zip.outputStream.on("error", reject);
    output.on("error", reject);
    output.on("close", resolve);
  });
}

async function writeChecksum() {
  const digest = await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = fs.createReadStream(zipPath);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", reject);
    input.on("end", () => resolve(hash.digest("hex")));
  });
  await fsp.writeFile(checksumPath, `${digest}  ${zipName}\n`);
  console.log(`${digest}  ${zipName}`);
}

await writeZip();
await writeChecksum();
