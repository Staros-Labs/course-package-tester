import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function redactPath(value) {
  if (!value) return "";
  const home = os.homedir();
  return String(value).replaceAll(home, "~");
}

export function buildTesterReport({ status, version }) {
  return {
    reportType: "tester-report",
    generatedAt: new Date().toISOString(),
    testerVersion: version,
    package: {
      activeCourseId: status.activeCourseId || "",
      activeLaunchPath: status.activeLaunchPath || "",
      launchMode: status.mode || "",
      libraryMode: status.library && status.library.mode ? status.library.mode : "",
      libraryRoot: redactPath(status.library && status.library.root ? status.library.root : ""),
    },
    manifest: status.activeCourse && status.activeCourse.manifest
      ? {
          present: true,
          parsed: !!status.activeCourse.manifest.parsed,
          title: status.activeCourse.manifest.title || "",
          launchPath: status.activeCourse.manifest.launchPath || "",
          error: status.activeCourse.manifest.error || "",
        }
      : { present: false, parsed: false, title: "", launchPath: "", error: "" },
    scormSession: status.session || {},
    localEvents: {
      currentBatchCount: status.telemetry && Array.isArray(status.telemetry.events) ? status.telemetry.events.length : 0,
      totalEvents: status.telemetry && status.telemetry.totalEvents ? status.telemetry.totalEvents : 0,
      historyCount: status.telemetry && Array.isArray(status.telemetry.history) ? status.telemetry.history.length : 0,
    },
  };
}

export function buildDiagnostics({ status, version, lastError = "" }) {
  return {
    reportType: "diagnostics",
    generatedAt: new Date().toISOString(),
    testerVersion: version,
    platform: {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      node: process.version,
    },
    lastError,
    library: {
      root: redactPath(status.library && status.library.root ? status.library.root : ""),
      mode: status.library && status.library.mode ? status.library.mode : "",
      courseCount: status.library && status.library.courseCount ? status.library.courseCount : 0,
    },
    activeCourseId: status.activeCourseId || "",
    activeLaunchPath: status.activeLaunchPath || "",
    mode: status.mode || "",
    browserSession: status.browserSession || {},
    frame: status.frame || {},
    boot: status.boot || {},
    log: status.log || [],
  };
}

export function writeJsonExport({ directory, prefix, payload }) {
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(directory, `${prefix}-${stamp}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}
