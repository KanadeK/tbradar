import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command, arguments_, options = {}) {
  console.log(`\n> ${command} ${arguments_.join(" ")}`);
  const result = spawnSync(command, arguments_, { stdio: "inherit", shell: false, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpm(arguments_) {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath || !existsSync(npmExecPath)) {
    throw new Error("npm_execpath is unavailable. Run this gate through: npm run release:check");
  }
  run(process.execPath, [npmExecPath, ...arguments_]);
}

const allowDirty = process.argv.includes("--allow-dirty");
const head = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
  encoding: "utf8",
  shell: false,
});
if (head.status !== 0) throw new Error("Create the release commit before running the final gate.");

if (!allowDirty) {
  const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8", shell: false });
  if (status.status !== 0) throw new Error(status.stderr.trim() || "git status failed");
  if (status.stdout.trim()) {
    throw new Error(
      "The worktree is not clean. Commit intentional changes or use --allow-dirty during development only.",
    );
  }
}

const history = spawnSync("git", ["log", "--format=%B"], { encoding: "utf8", shell: false });
if (/^Co-authored-by:/im.test(history.stdout))
  throw new Error("Commit history contains a Co-authored-by trailer.");

runNpm(["run", "verify:full"]);
runNpm(["run", "package"]);
runNpm(["run", "package:verify"]);

const checksumPath = path.resolve("release", "SHA256SUMS");
const checksum = readFileSync(checksumPath, "utf8").trim();
console.log(`\nRelease gate passed. ${checksum}`);
