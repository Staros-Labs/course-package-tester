import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverCourses, safeJoin } from "../lib/library.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

test("discovers sample fixture as launchable course", () => {
  const courses = discoverCourses({
    contentRoot: path.join(repoRoot, "fixtures"),
    libraryMode: "folders",
    importsRoot: "",
  });
  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, "sample-scorm");
  assert.equal(courses[0].hasManifest, true);
});

test("safeJoin rejects traversal", () => {
  assert.equal(safeJoin("/tmp/base", "../evil"), null);
  assert.equal(safeJoin("/tmp/base", "/tmp/evil"), null);
  assert.equal(safeJoin("/tmp/base", "safe/file.txt"), "/tmp/base/safe/file.txt");
});
