import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUrl = process.env.SCORM_TESTER_URL || "http://localhost:4310";
const mode = process.argv[2] || "mock";
const courseId = process.argv[3] || undefined;
const validModes = new Set(["standalone", "mock", "resume", "mobile-simulation", "local-events"]);

if (!validModes.has(mode)) {
  console.error("Usage: node launch.mjs [standalone|mock|resume|mobile-simulation|local-events] [courseId]");
  process.exit(1);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = body && body.error ? body.error : response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return body;
}

async function isServerUp() {
  try {
    await request("/api/status");
    return true;
  } catch {
    return false;
  }
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, "server.mjs")], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

async function waitForServer(timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerUp()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for Course Package Tester server");
}

function openBrowser(url) {
  if (process.env.SCORM_TESTER_NO_OPEN === "1") {
    return;
  }
  execFile("open", [url], (error) => {
    if (error) {
      console.error(`Browser open failed: ${error.message}`);
    }
  });
}

async function main() {
  if (!(await isServerUp())) {
    startServer();
    await waitForServer();
  }

  const launch = await request("/api/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId,
      mode,
      cwd: process.cwd(),
    }),
  });

  openBrowser(`${baseUrl}/scorm-tester/`);

  const desired = launch && launch.desiredLaunch ? launch.desiredLaunch : null;
  if (desired) {
    console.log(`Launched ${desired.courseId} in ${desired.mode} mode`);
    return;
  }

  console.log(`Opened Course Package Tester in ${mode} mode`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
