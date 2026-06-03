import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const projectDir = path.resolve(scriptsDir, "..");
const appDir = path.join(projectDir, "dist", "desktop", "Course Package Tester-win32-x64");

const topLevelDocs = [
  "README.md",
  "USER_GUIDE.md",
  "WINDOWS_IT_HANDOFF.md",
  "NETWORK_BEHAVIOR.md",
  "SECURITY_REVIEW_CHECKLIST.md",
  "SECURITY.md",
  "DISCLAIMER.md",
  "LICENSE",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(relativePath, destinationRoot) {
  const sourcePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing handoff file: ${relativePath}`);
  }

  const destinationPath = path.join(destinationRoot, relativePath);
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

if (!fs.existsSync(appDir)) {
  throw new Error(`Packaged Windows app not found: ${appDir}`);
}

for (const doc of topLevelDocs) {
  copyFile(doc, appDir);
}

console.log(`Prepared Windows release docs in ${appDir}`);
