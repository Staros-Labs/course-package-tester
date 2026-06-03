const baseUrl = process.env.SCORM_TESTER_URL || "http://localhost:4310";
const [command, ...args] = process.argv.slice(2);

function usage() {
  console.error(`Usage:
  node client.mjs courses
  node client.mjs status
  node client.mjs local-events
  node client.mjs launch [courseId] [mode]
  node client.mjs click <selector>
  node client.mjs type <selector> <text>
  node client.mjs key <key>
  node client.mjs snapshot
  node client.mjs reset-log`);
  process.exit(1);
}

const MODES = new Set(["standalone", "mock", "resume", "mobile-simulation", "local-events"]);

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

async function waitForCommand(id, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await request("/api/status");
    const commandState = (status.commands || []).find((item) => item.id === id);
    if (commandState && commandState.status !== "pending") {
      return commandState;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for command ${id}`);
}

async function queueCommand(payload) {
  const queued = await request("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return waitForCommand(queued.command.id);
}

async function main() {
  if (!command) usage();

  if (command === "courses") {
    console.log(JSON.stringify(await request("/api/courses"), null, 2));
    return;
  }

  if (command === "status") {
    const status = await request("/api/status");
    const summary = {
      activeCourseId: status.activeCourseId,
      activeLaunchPath: status.activeLaunchPath,
      mode: status.mode,
      library: status.library || null,
      browserSession: status.browserSession || null,
      lmsConnected: status.lmsConnected,
      boot: status.boot,
      frame: {
        title: status.frame && status.frame.title ? status.frame.title : "",
        url: status.frame && status.frame.url ? status.frame.url : "",
        ready: !!(status.frame && status.frame.ready),
      },
      localEvents: status.telemetry
        ? {
            lastBatchAt: status.telemetry.lastBatchAt || "",
            eventCount: Array.isArray(status.telemetry.events) ? status.telemetry.events.length : 0,
            totalEvents: status.telemetry.totalEvents || 0,
            historyCount: Array.isArray(status.telemetry.history) ? status.telemetry.history.length : 0,
            lastHeaders: status.telemetry.lastHeaders || {},
          }
        : null,
      commandCount: Array.isArray(status.commands) ? status.commands.length : 0,
      logCount: Array.isArray(status.log) ? status.log.length : 0,
    };
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (command === "local-events") {
    const status = await request("/api/status");
    const telemetry = status.telemetry || {};
    const events = Array.isArray(telemetry.events) ? telemetry.events : [];
    const payload = {
      lastBatchAt: telemetry.lastBatchAt || "",
      eventCount: events.length,
      totalEvents: telemetry.totalEvents || 0,
      historyCount: Array.isArray(telemetry.history) ? telemetry.history.length : 0,
      lastHeaders: telemetry.lastHeaders || {},
      events,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (command === "launch") {
    let [courseId, mode = "mock"] = args;
    if (courseId && MODES.has(courseId) && !args[1]) {
      mode = courseId;
      courseId = undefined;
    }
    if (mode && !MODES.has(mode)) usage();
    console.log(JSON.stringify(await request("/api/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, mode, cwd: process.cwd() }),
    }), null, 2));
    return;
  }

  if (command === "click") {
    const [selector] = args;
    if (!selector) usage();
    console.log(JSON.stringify(await queueCommand({ action: "click", selector }), null, 2));
    return;
  }

  if (command === "type") {
    const [selector, ...textParts] = args;
    if (!selector || textParts.length === 0) usage();
    console.log(JSON.stringify(await queueCommand({
      action: "type",
      selector,
      text: textParts.join(" "),
    }), null, 2));
    return;
  }

  if (command === "key") {
    const [key] = args;
    if (!key) usage();
    console.log(JSON.stringify(await queueCommand({ action: "keydown", key }), null, 2));
    return;
  }

  if (command === "snapshot") {
    console.log(JSON.stringify(await queueCommand({ action: "snapshot" }), null, 2));
    return;
  }

  if (command === "reset-log") {
    console.log(JSON.stringify(await request("/api/log/reset", { method: "POST" }), null, 2));
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
