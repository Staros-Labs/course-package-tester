import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const testDir = path.resolve("test");
const files = fs.readdirSync(testDir)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join("test", name));

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
