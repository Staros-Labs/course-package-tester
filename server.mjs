import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { importedCourseIdFromDirectory, importZipPackage } from "./lib/importer.mjs";
import { discoverCourses, isDirectory, normalizePath, safeJoin } from "./lib/library.mjs";
import { normalizeLaunchMode } from "./lib/launch-modes.mjs";
import { buildDiagnostics, buildTesterReport, writeJsonExport } from "./lib/reports.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentRoot = resolveContentRoot();
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4310);
const libraryMode = resolveLibraryMode();
const userDataRoot = process.env.COURSE_TESTER_USER_DATA
  ? path.resolve(process.env.COURSE_TESTER_USER_DATA)
  : path.join(os.homedir(), ".course-package-tester");
const importsRoot = process.env.COURSE_TESTER_IMPORTS_ROOT
  ? path.resolve(process.env.COURSE_TESTER_IMPORTS_ROOT)
  : path.join(userDataRoot, "imports");
const exportsRoot = process.env.COURSE_TESTER_EXPORTS_ROOT
  ? path.resolve(process.env.COURSE_TESTER_EXPORTS_ROOT)
  : path.join(userDataRoot, "exports");
const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
let lastError = "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const state = {
  courses: [],
  harness: {
    activeCourseId: null,
    activeLaunchPath: null,
    mode: "mock",
    desiredLaunch: null,
    launchCounter: 0,
    lastHarnessPollAt: "",
    lastHarnessStateAt: "",
    frame: { title: "", url: "", ready: false, textPreview: "", controls: [] },
    lmsConnected: false,
    session: {},
    boot: {
      desktopGate: { checked: false, allowed: true, reason: "" },
      runtime: { bootstrapped: false, started: false, reviewMode: false },
      tracking: { type: "scorm", ready: false, compatibilityAttached: false, lastStatement: null },
      telemetry: { enabled: false, endpoint: "", queuedCount: 0, sentCount: 0, lastError: "" },
      state: { restored: false, summary: "" },
    },
    log: [],
    telemetry: { events: [], history: [], totalEvents: 0, lastBatchAt: "", lastHeaders: {} },
  },
  commands: [],
  commandCounter: 0,
};

function resolveContentRoot() {
  const override = process.env.COURSE_TESTER_ROOT || process.env.SCORM_TESTER_ROOT || "";
  if (override) return path.resolve(override);
  return path.resolve(__dirname, "fixtures");
}

function resolveLibraryMode() {
  const override = String(process.env.COURSE_TESTER_LIBRARY_MODE || "").trim().toLowerCase();
  if (override === "folders") return "folders";
  if (override === "alm-courses") return "alm-courses";
  if (fs.existsSync(path.join(contentRoot, "internal")) || fs.existsSync(path.join(contentRoot, "external"))) {
    return "alm-courses";
  }
  return "folders";
}

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload, null, 2), MIME_TYPES[".json"]);
}

function sendCors(res, status, body, contentType = "text/plain; charset=utf-8", req = null) {
  const origin = req && req.headers && req.headers.origin ? req.headers.origin : "*";
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Telemetry-Course",
    Vary: "Origin",
  });
  res.end(body);
}

function sendCorsJson(res, status, payload, req = null) {
  sendCors(res, status, JSON.stringify(payload, null, 2), MIME_TYPES[".json"], req);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`Invalid JSON: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function readBinaryBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > 300 * 1024 * 1024) {
        reject(new Error("Uploaded zip is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function appendLog(message, extra = {}) {
  state.harness.log.push({ ts: new Date().toISOString(), message, ...extra });
  if (state.harness.log.length > 300) state.harness.log = state.harness.log.slice(-300);
}

function resetHarnessRuntime() {
  state.harness.frame = { title: "", url: "", ready: false, textPreview: "", controls: [] };
  state.harness.lmsConnected = false;
  state.harness.session = {};
  state.harness.boot = {
    desktopGate: { checked: false, allowed: true, reason: "" },
    runtime: { bootstrapped: false, started: false, reviewMode: false },
    tracking: { type: "scorm", ready: false, compatibilityAttached: false, lastStatement: null },
    telemetry: { enabled: false, endpoint: "", queuedCount: 0, sentCount: 0, lastError: "" },
    state: { restored: false, summary: "" },
  };
  state.harness.telemetry = { events: [], history: [], totalEvents: 0, lastBatchAt: "", lastHeaders: {} };
}

function getHarnessSessionState() {
  const now = Date.now();
  const pollAt = state.harness.lastHarnessPollAt ? Date.parse(state.harness.lastHarnessPollAt) : 0;
  const stateAt = state.harness.lastHarnessStateAt ? Date.parse(state.harness.lastHarnessStateAt) : 0;
  const lastSeen = Math.max(pollAt || 0, stateAt || 0);
  return {
    connected: !!lastSeen && (now - lastSeen) < 15000,
    waitingForBrowser: !!state.harness.desiredLaunch,
    lastHarnessPollAt: state.harness.lastHarnessPollAt,
    lastHarnessStateAt: state.harness.lastHarnessStateAt,
  };
}

function refreshCourseList() {
  state.courses = discoverCourses({ contentRoot, libraryMode, importsRoot });
  return state.courses;
}

function findCourse(courseId) {
  return state.courses.find((course) => course.id === courseId) || null;
}

function defaultCourse() {
  if (state.harness.activeCourseId) {
    const activeCourse = findCourse(state.harness.activeCourseId);
    if (activeCourse) return activeCourse;
  }
  return state.courses[0] || null;
}

function findCourseFromCwd(cwd) {
  if (!cwd) return null;
  const relative = normalizePath(path.relative(contentRoot, cwd));
  if (!relative || relative.startsWith("..")) return null;
  return state.courses.find((course) => relative === course.id || relative.startsWith(`${course.id}/`)) || null;
}

function resolveCourse(courseRef, cwd) {
  const courseFromCwd = findCourseFromCwd(cwd);
  if (courseFromCwd) return courseFromCwd;
  if (!courseRef) return defaultCourse();
  const normalized = String(courseRef).trim();
  if (!normalized) return defaultCourse();
  return state.courses.find((course) =>
    course.id === normalized ||
    course.launchPath === normalized ||
    course.slug === normalized ||
    course.label === normalized
  ) || null;
}

function queueCommand(command) {
  const queued = {
    id: ++state.commandCounter,
    createdAt: new Date().toISOString(),
    status: "pending",
    result: null,
    ...command,
  };
  state.commands.push(queued);
  return queued;
}

function normalizeFrame(frame) {
  return {
    title: frame && frame.title ? frame.title : "",
    url: frame && frame.url ? frame.url : "",
    ready: !!(frame && frame.ready),
    textPreview: frame && frame.textPreview ? frame.textPreview : "",
    controls: frame && Array.isArray(frame.controls) ? frame.controls : [],
  };
}

function frameMatchesActiveCourse(frame) {
  if (!state.harness.activeLaunchPath) return true;
  const url = frame && frame.url ? String(frame.url) : "";
  return !!url && url.includes(`/course/${state.harness.activeLaunchPath}`);
}

function snapshotStatus() {
  const activeCourse = findCourse(state.harness.activeCourseId);
  return {
    version: packageInfo.version,
    activeCourseId: state.harness.activeCourseId,
    activeCourse,
    activeLaunchPath: state.harness.activeLaunchPath,
    mode: state.harness.mode,
    desiredLaunch: state.harness.desiredLaunch,
    browserSession: getHarnessSessionState(),
    lmsConnected: state.harness.lmsConnected,
    session: state.harness.session,
    boot: state.harness.boot,
    frame: state.harness.frame,
    telemetry: state.harness.telemetry,
    log: state.harness.log,
    commands: state.commands.map((command) => ({
      id: command.id,
      action: command.action,
      status: command.status,
      selector: command.selector || null,
      result: command.result,
    })),
    library: {
      root: contentRoot,
      importsRoot,
      mode: libraryMode,
      courseCount: state.courses.length,
    },
  };
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME_TYPES[ext] || "application/octet-stream");
  });
}

function resolveCourseFile(relativePath) {
  const normalized = normalizePath(relativePath);
  if (normalized.startsWith("imports/")) {
    return safeJoin(importsRoot, normalized.slice("imports/".length));
  }
  return safeJoin(contentRoot, normalized);
}

async function handleZipImport(req, res) {
  const filename = decodeURIComponent(String(req.headers["x-file-name"] || "package.zip"));
  const payload = await readBinaryBody(req);
  if (!payload.length) {
    sendJson(res, 400, { error: "No zip payload received" });
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "course-package-upload-"));
  const tempZip = path.join(tempDir, "upload.zip");
  fs.writeFileSync(tempZip, payload);
  try {
    const result = await importZipPackage({ zipPath: tempZip, originalFilename: filename, importsRoot });
    refreshCourseList();
    const courseId = importedCourseIdFromDirectory(importsRoot, result.directory);
    sendJson(res, 200, { ok: true, courseId, ...result });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function handleImportRemove(req, res) {
  const body = await readJsonBody(req);
  const courseId = normalizePath(body.courseId || "");
  if (!courseId.startsWith("imports/")) {
    sendJson(res, 400, { error: "Only imported packages can be removed." });
    return;
  }
  const target = safeJoin(importsRoot, courseId.slice("imports/".length));
  if (!target || !isDirectory(target)) {
    sendJson(res, 404, { error: "Imported package not found." });
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  refreshCourseList();
  sendJson(res, 200, { ok: true });
}

refreshCourseList();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === "/api/telemetry/batch" && req.method === "OPTIONS") {
      sendCors(res, 204, "", "text/plain; charset=utf-8", req);
      return;
    }

    if (pathname === "/api/courses" && req.method === "GET") {
      sendJson(res, 200, {
        courses: refreshCourseList(),
        library: { root: contentRoot, importsRoot, mode: libraryMode },
        version: packageInfo.version,
      });
      return;
    }

    if (pathname === "/api/status" && req.method === "GET") {
      sendJson(res, 200, snapshotStatus());
      return;
    }

    if (pathname === "/api/import/zip" && req.method === "POST") {
      await handleZipImport(req, res);
      return;
    }

    if (pathname === "/api/import/remove" && req.method === "POST") {
      await handleImportRemove(req, res);
      return;
    }

    if (pathname === "/api/export/tester-report" && req.method === "POST") {
      const report = buildTesterReport({ status: snapshotStatus(), version: packageInfo.version });
      const filePath = writeJsonExport({ directory: exportsRoot, prefix: "tester-report", payload: report });
      sendJson(res, 200, { ok: true, filePath, report });
      return;
    }

    if (pathname === "/api/export/diagnostics" && req.method === "POST") {
      const diagnostics = buildDiagnostics({ status: snapshotStatus(), version: packageInfo.version, lastError });
      const filePath = writeJsonExport({ directory: exportsRoot, prefix: "diagnostics", payload: diagnostics });
      sendJson(res, 200, { ok: true, filePath, diagnostics });
      return;
    }

    if (pathname === "/api/log/reset" && req.method === "POST") {
      state.harness.log = [];
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/launch" && req.method === "POST") {
      const body = await readJsonBody(req);
      refreshCourseList();
      const course = resolveCourse(body.courseId || body.course || body.launchPath || body.slug, body.cwd);
      if (!course) {
        sendJson(res, 404, { error: "Unknown course. Use /api/courses to inspect the launchable library." });
        return;
      }

      const mode = normalizeLaunchMode(body.mode || "mock");
      state.harness.activeCourseId = course.id;
      state.harness.activeLaunchPath = course.launchPath;
      state.harness.mode = mode;
      state.harness.launchCounter += 1;
      state.harness.desiredLaunch = {
        token: state.harness.launchCounter,
        courseId: course.id,
        launchPath: course.launchPath,
        mode,
        preset: {
          studentName: body.studentName || "Tester, Pat",
          lessonStatus: body.lessonStatus || "not attempted",
          lessonLocation: body.lessonLocation || "",
          rawScore: body.rawScore || "",
          suspendData: body.suspendData || "{}",
        },
      };
      resetHarnessRuntime();
      appendLog(`Launch requested for ${course.id}`, { mode });
      sendJson(res, 200, { ok: true, desiredLaunch: state.harness.desiredLaunch });
      return;
    }

    if (pathname === "/api/harness/poll" && req.method === "GET") {
      state.harness.lastHarnessPollAt = new Date().toISOString();
      sendJson(res, 200, {
        desiredLaunch: state.harness.desiredLaunch,
        pendingCommands: state.commands.filter((command) => command.status === "pending"),
      });
      return;
    }

    if (pathname === "/api/harness/launch-complete" && req.method === "POST") {
      const body = await readJsonBody(req);
      if (state.harness.desiredLaunch && body.token === state.harness.desiredLaunch.token) {
        state.harness.desiredLaunch = null;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/harness/state" && req.method === "POST") {
      const body = await readJsonBody(req);
      state.harness.lastHarnessStateAt = new Date().toISOString();
      const nextFrame = body.frame ? normalizeFrame(body.frame) : null;

      if (nextFrame && nextFrame.ready && !frameMatchesActiveCourse(nextFrame)) {
        appendLog(`Ignored stale harness state for ${nextFrame.url}`, { source: "harness-state" });
        sendJson(res, 200, { ok: true, ignored: "stale-frame-state" });
        return;
      }

      state.harness.lmsConnected = !!body.lmsConnected;
      state.harness.session = body.session || {};
      state.harness.boot = {
        desktopGate: body.boot && body.boot.desktopGate ? body.boot.desktopGate : state.harness.boot.desktopGate,
        runtime: body.boot && body.boot.runtime ? body.boot.runtime : state.harness.boot.runtime,
        tracking: body.boot && body.boot.tracking ? body.boot.tracking : state.harness.boot.tracking,
        telemetry: body.boot && body.boot.telemetry ? body.boot.telemetry : state.harness.boot.telemetry,
        state: body.boot && body.boot.state ? body.boot.state : state.harness.boot.state,
        trackingConfig: body.boot && body.boot.trackingConfig ? body.boot.trackingConfig : state.harness.boot.trackingConfig,
      };
      if (nextFrame) state.harness.frame = nextFrame;
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/telemetry/batch" && req.method === "POST") {
      const body = await readJsonBody(req);
      const events = body && Array.isArray(body.events) ? body.events : [];
      state.harness.telemetry = {
        events,
        history: [{ receivedAt: new Date().toISOString(), count: events.length, client: body && body.client ? body.client : {}, events }, ...(state.harness.telemetry.history || [])].slice(0, 20),
        totalEvents: (state.harness.telemetry.totalEvents || 0) + events.length,
        lastBatchAt: new Date().toISOString(),
        lastHeaders: {
          origin: req.headers.origin || "",
          contentType: req.headers["content-type"] || "",
          telemetryCourse: req.headers["x-telemetry-course"] || "",
        },
      };
      appendLog(`Local event batch received (${events.length})`, { source: "local-events-endpoint" });
      sendCorsJson(res, 200, { ok: true, received: events.length }, req);
      return;
    }

    if (pathname === "/api/harness/log" && req.method === "POST") {
      const body = await readJsonBody(req);
      appendLog(body.message || "Harness event", { source: body.source || "harness" });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/commands" && req.method === "POST") {
      const body = await readJsonBody(req);
      const command = queueCommand({
        action: body.action,
        selector: body.selector || null,
        text: body.text || null,
        key: body.key || null,
        description: body.description || null,
      });
      appendLog(`Command queued: ${command.action}`, { commandId: command.id });
      sendJson(res, 200, { ok: true, command });
      return;
    }

    if (pathname === "/api/commands/next" && req.method === "GET") {
      const next = state.commands.find((command) => command.status === "pending") || null;
      sendJson(res, 200, { command: next });
      return;
    }

    if (pathname === "/api/commands/result" && req.method === "POST") {
      const body = await readJsonBody(req);
      const command = state.commands.find((item) => item.id === body.id);
      if (!command) {
        sendJson(res, 404, { error: "Unknown command id" });
        return;
      }
      command.status = body.ok ? "done" : "failed";
      command.result = body.result || null;
      if (body.ok && body.result) {
        if (body.result.frame) state.harness.frame = normalizeFrame(body.result.frame);
        else if (command.action === "snapshot") state.harness.frame = normalizeFrame(body.result);
      }
      appendLog(`Command ${command.status}: ${command.action}`, { commandId: command.id });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/" || pathname === "/scorm-tester" || pathname === "/scorm-tester/") {
      serveFile(res, path.join(publicDir, "index.html"));
      return;
    }

    if (pathname.startsWith("/scorm-tester/assets/")) {
      const assetPath = safeJoin(publicDir, pathname.replace("/scorm-tester/assets/", "assets/"));
      if (!assetPath) return send(res, 400, "Bad path");
      serveFile(res, assetPath);
      return;
    }

    if (pathname.startsWith("/course/")) {
      const relativePath = pathname.slice("/course/".length);
      const filePath = resolveCourseFile(relativePath);
      if (!filePath) return send(res, 400, "Bad path");
      serveFile(res, filePath);
      return;
    }

    send(res, 404, "Not found");
  } catch (error) {
    lastError = error.message;
    sendJson(res, 500, { error: error.message });
  }
});

export function startTesterServer() {
  refreshCourseList();
  if (server.listening) {
    return Promise.resolve({ port, url: `http://localhost:${port}/scorm-tester/`, contentRoot, importsRoot, libraryMode });
  }

  return new Promise((resolve, reject) => {
    function handleError(error) {
      server.off("listening", handleListening);
      reject(error);
    }
    function handleListening() {
      server.off("error", handleError);
      resolve({ port, url: `http://localhost:${port}/scorm-tester/`, contentRoot, importsRoot, libraryMode });
    }
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, "127.0.0.1");
  });
}

export function stopTesterServer() {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  startTesterServer()
    .then((details) => {
      console.log(`Course Package Tester running at ${details.url}`);
      console.log(`Library root: ${details.contentRoot}`);
      console.log(`Imports root: ${details.importsRoot}`);
      console.log(`Library mode: ${details.libraryMode}`);
    })
    .catch((error) => {
      console.error(`Course Package Tester failed to start: ${error.message}`);
      process.exit(1);
    });
}
