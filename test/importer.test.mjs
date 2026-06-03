import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import yazl from "yazl";
import { describeImportError, importZipPackage, normalizeZipEntryName } from "../lib/importer.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "course-package-test-"));
}

function addDirectoryToZip(zip, sourceDir, prefix = "") {
  for (const name of fs.readdirSync(sourceDir)) {
    const fullPath = path.join(sourceDir, name);
    const zipPath = prefix ? `${prefix}/${name}` : name;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) addDirectoryToZip(zip, fullPath, zipPath);
    else zip.addFile(fullPath, zipPath);
  }
}

function zipDir(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    addDirectoryToZip(zip, sourceDir);
    zip.outputStream
      .pipe(fs.createWriteStream(zipPath))
      .on("close", resolve)
      .on("error", reject);
    zip.end();
  });
}

test("imports zip and deduplicates by sha256", async () => {
  const temp = makeTempDir();
  const source = path.join(temp, "source", "wrapped");
  const importsRoot = path.join(temp, "imports");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "index.html"), "<!doctype html><title>Sample</title>");
  const zipPath = path.join(temp, "sample.zip");
  await zipDir(path.join(temp, "source"), zipPath);

  const first = await importZipPackage({ zipPath, originalFilename: "sample.zip", importsRoot });
  const second = await importZipPackage({ zipPath, originalFilename: "renamed.zip", importsRoot });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(first.metadata.launchPath, "index.html");
  assert.equal(fs.existsSync(path.join(first.directory, "index.html")), true);
});

test("rejects zip-slip paths", () => {
  assert.equal(normalizeZipEntryName("../evil.txt"), "");
  assert.equal(normalizeZipEntryName("nested/../../evil.txt"), "");
  assert.equal(normalizeZipEntryName("C:/evil.txt"), "");
  assert.equal(normalizeZipEntryName("/absolute/evil.txt"), "absolute/evil.txt");
  assert.equal(normalizeZipEntryName("safe/index.html"), "safe/index.html");
});

test("describes import failures with user-facing suggestions", () => {
  const missingLaunch = describeImportError(new Error("The zip does not contain an imsmanifest.xml launch target or an index.html file."));
  assert.equal(missingLaunch.status, 400);
  assert.equal(missingLaunch.category, "missing-launch-file");
  assert.match(missingLaunch.suggestion, /imsmanifest\.xml/);

  const unsafe = describeImportError(new Error("Unsafe zip entry path: ../evil.txt"));
  assert.equal(unsafe.category, "unsafe-zip-path");
  assert.match(unsafe.suggestion, /Re-export/);

  const fileCount = describeImportError(new Error("Zip contains too many files. Maximum is 5000."));
  assert.equal(fileCount.status, 413);
  assert.equal(fileCount.category, "file-count");
});
