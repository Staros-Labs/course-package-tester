import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagnostics, buildTesterReport } from "../lib/reports.mjs";

test("builds tester report payload", () => {
  const report = buildTesterReport({
    version: "1.0.0",
    status: {
      activeCourseId: "sample",
      activeLaunchPath: "sample/index.html",
      mode: "mock",
      library: { root: "/tmp/library", mode: "folders" },
      session: { "cmi.core.lesson_status": "completed" },
      telemetry: { events: [1], totalEvents: 1, history: [] },
    },
  });
  assert.equal(report.reportType, "tester-report");
  assert.equal(report.testerVersion, "1.0.0");
  assert.equal(report.package.launchMode, "mock");
  assert.equal(report.localEvents.totalEvents, 1);
});

test("builds diagnostics payload", () => {
  const diagnostics = buildDiagnostics({
    version: "1.0.0",
    lastError: "boom",
    status: { library: { root: "/tmp/library", mode: "folders", courseCount: 1 } },
  });
  assert.equal(diagnostics.reportType, "diagnostics");
  assert.equal(diagnostics.lastError, "boom");
  assert.equal(diagnostics.library.courseCount, 1);
});
