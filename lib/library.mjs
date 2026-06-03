import fs from "node:fs";
import path from "node:path";
import { detectLaunchPath } from "./manifest.mjs";

export function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

export function safeJoin(base, requestedPath) {
  const normalized = path.normalize(requestedPath);
  if (path.isAbsolute(normalized) || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    return null;
  }
  const resolved = path.resolve(base, normalized);
  return resolved.startsWith(base + path.sep) || resolved === base ? resolved : null;
}

export function createCourseRecord({ courseDir, relativeCourseRoot, labelPrefix = "", source = "folder" }) {
  const detection = detectLaunchPath(courseDir);
  if (!detection.launchPath) return null;

  const launchRelative = normalizePath(path.join(relativeCourseRoot, detection.launchPath));
  const normalizedRoot = normalizePath(relativeCourseRoot);
  const label = labelPrefix && !normalizedRoot.startsWith(`${labelPrefix}/`)
    ? `${labelPrefix}/${normalizedRoot}`
    : normalizedRoot;

  return {
    id: normalizedRoot,
    source,
    type: detection.type,
    track: labelPrefix || source,
    slug: path.basename(courseDir),
    label,
    rootPath: courseDir,
    launchPath: launchRelative,
    launchFile: detection.launchPath,
    hasManifest: !!detection.manifest,
    manifest: detection.manifest,
  };
}

export function walkFolderLibrary(baseDir, courses, relativePrefix = "") {
  if (!isDirectory(baseDir)) return;

  const record = relativePrefix
    ? createCourseRecord({ courseDir: baseDir, relativeCourseRoot: relativePrefix })
    : null;
  if (record) {
    courses.push(record);
    return;
  }

  for (const name of fs.readdirSync(baseDir)) {
    const childDir = path.join(baseDir, name);
    if (!isDirectory(childDir)) continue;
    const childPrefix = relativePrefix ? `${relativePrefix}/${name}` : name;
    walkFolderLibrary(childDir, courses, childPrefix);
  }
}

export function discoverCourses({ contentRoot, libraryMode = "folders", importsRoot = "" }) {
  const courses = [];

  if (libraryMode === "alm-courses") {
    for (const root of ["internal", "external"]) {
      const baseDir = path.join(contentRoot, root);
      if (!isDirectory(baseDir)) continue;
      for (const name of fs.readdirSync(baseDir)) {
        const courseDir = path.join(baseDir, name);
        if (!isDirectory(courseDir)) continue;
        const record = createCourseRecord({
          courseDir,
          relativeCourseRoot: `${root}/${name}`,
          labelPrefix: root,
          source: "folder",
        });
        if (record) courses.push(record);
      }
    }
  } else {
    walkFolderLibrary(contentRoot, courses);
  }

  if (importsRoot && isDirectory(importsRoot)) {
    for (const name of fs.readdirSync(importsRoot)) {
      const courseDir = path.join(importsRoot, name);
      if (!isDirectory(courseDir)) continue;
      const record = createCourseRecord({
        courseDir,
        relativeCourseRoot: `imports/${name}`,
        labelPrefix: "imports",
        source: "import",
      });
      if (!record) continue;
      const metadataPath = path.join(courseDir, ".course-package-tester.json");
      if (fs.existsSync(metadataPath)) {
        try {
          record.import = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
          record.label = record.import.title || record.import.originalFilename || record.label;
        } catch {}
      }
      courses.push(record);
    }
  }

  return courses.sort((a, b) => a.label.localeCompare(b.label));
}
