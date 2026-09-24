import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const auditDir = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(auditDir, "..");
const venvDir = path.join(auditDir, ".venv");
const venvSlither =
  process.platform === "win32"
    ? path.join(venvDir, "Scripts", "slither.exe")
    : path.join(venvDir, "bin", "slither");
const venvPip =
  process.platform === "win32"
    ? path.join(venvDir, "Scripts", "pip.exe")
    : path.join(venvDir, "bin", "pip");
const requirements = path.join(auditDir, "requirements.txt");
const configPath = path.join(auditDir, "slither.config.json");
const reportJson = path.join(auditDir, "slither-report.json");
const reportMd = path.join(auditDir, "slither.md");
const logPath = path.join(auditDir, "slither.log");

function runOrThrow(command: string, args: string[], errorMessage: string): void {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status === 0) return;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  console.error(errorMessage);
  process.exit(1);
}

function pythonVersion(command: string): number | undefined {
  const result = spawnSync(command, ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"], {
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) return undefined;
  const [major, minor] = result.stdout.trim().split(".").map(Number);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return undefined;
  return major * 100 + minor;
}

function resolvePython(): string {
  const candidates =
    process.platform === "win32"
      ? ["python", "python3"]
      : ["python3.13", "python3.12", "python3.11", "python3.10", "python3"];
  for (const command of candidates) {
    const version = pythonVersion(command);
    if (version !== undefined && version >= 310) return command;
  }
  console.error("Need Python 3.10+ to create contracts/audit/.venv.");
  process.exit(1);
}

function ensureProjectSlither(): string {
  if (existsSync(venvSlither)) return venvSlither;
  if (existsSync(venvDir)) rmSync(venvDir, { recursive: true, force: true });
  runOrThrow(resolvePython(), ["-m", "venv", venvDir], "Could not create contracts/audit/.venv.");
  runOrThrow(
    venvPip,
    ["install", "-r", requirements],
    "Could not install slither-analyzer into contracts/audit/.venv."
  );
  return venvSlither;
}

const slitherBin = ensureProjectSlither();
const result = spawnSync(
  slitherBin,
  [
    ".",
    "--config-file",
    configPath,
    "--json",
    reportJson,
    "--checklist",
    "--fail-high",
  ],
  {
    cwd: contractsDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  }
);

const stdout = result.stdout ?? "";
const checklistAt = stdout.indexOf("**THIS CHECKLIST IS NOT COMPLETE**");
writeFileSync(reportMd, checklistAt === -1 ? stdout : stdout.slice(checklistAt));
writeFileSync(logPath, result.stderr ?? "");
if (result.stdout) process.stdout.write(result.stdout);
process.exit(result.status ?? 1);
