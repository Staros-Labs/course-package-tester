export const LAUNCH_MODES = new Set([
  "standalone",
  "mock",
  "resume",
  "mobile-simulation",
  "local-events",
]);

export function normalizeLaunchMode(value, fallback = "mock") {
  const mode = String(value || "").trim();
  if (LAUNCH_MODES.has(mode)) return mode;
  return fallback;
}
