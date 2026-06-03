import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectLaunchPath, parseManifestXml } from "../lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

test("parses SCORM manifest launch href", () => {
  const result = parseManifestXml(`<?xml version="1.0"?>
    <manifest>
      <organizations default="org"><organization identifier="org"><item identifierref="res"><title>Launch Title</title></item></organization></organizations>
      <resources><resource identifier="res" href="course/index.html"></resource></resources>
    </manifest>`);
  assert.equal(result.launchPath, "course/index.html");
  assert.equal(result.parsed, true);
});

test("detectLaunchPath prefers manifest href", () => {
  const result = detectLaunchPath(path.join(repoRoot, "fixtures", "sample-scorm"));
  assert.equal(result.type, "scorm");
  assert.equal(result.launchPath, "index.html");
  assert.equal(result.manifest.parsed, true);
});
