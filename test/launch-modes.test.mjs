import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLaunchMode } from "../lib/launch-modes.mjs";

test("normalizes public modes", () => {
  assert.equal(normalizeLaunchMode("mock"), "mock");
  assert.equal(normalizeLaunchMode("mobile-simulation"), "mobile-simulation");
});

test("falls back for unknown modes", () => {
  assert.equal(normalizeLaunchMode("unknown"), "mock");
});
