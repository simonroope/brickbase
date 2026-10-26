import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CORE_FILES = ["AssetVault.sol", "AssetShares.sol", "AssetUserAllowList.sol"] as const;

type Location = { start?: { line?: number } };

type IstanbulFile = {
  path?: string;
  s?: Record<string, number>;
  f?: Record<string, number>;
  b?: Record<string, number[]>;
  statementMap?: Record<string, Location>;
  fnMap?: Record<string, { name?: string; line?: number; loc?: Location }>;
  branchMap?: Record<string, { loc?: Location; line?: number }>;
};

function coveragePath(): string {
  const candidates = [
    path.resolve("coverage.json"),
    path.resolve("coverage/coverage-final.json"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "No coverage.json found. Run `npx hardhat coverage --testfiles 'tests/unit/*.t.ts'` from contracts/ first."
    );
  }
  return found;
}

function isCoreFile(filePath: string, name: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");
  return normalized.endsWith(`/core/${name}`) || normalized.endsWith(`core/${name}`);
}

function lineOf(loc: Location | undefined, fallback?: number): string {
  return String(loc?.start?.line ?? fallback ?? "?");
}

function uncovered(file: IstanbulFile): string[] {
  const issues: string[] = [];
  for (const [id, hits] of Object.entries(file.s ?? {})) {
    if (hits === 0) issues.push(`statement ${id} line ${lineOf(file.statementMap?.[id])}`);
  }
  for (const [id, hits] of Object.entries(file.f ?? {})) {
    if (hits === 0) {
      const fn = file.fnMap?.[id];
      issues.push(`function ${id} ${fn?.name ?? "?"} line ${lineOf(fn?.loc, fn?.line)}`);
    }
  }
  for (const [id, hits] of Object.entries(file.b ?? {})) {
    hits.forEach((hit, index) => {
      if (hit === 0) {
        const branch = file.branchMap?.[id];
        issues.push(`branch ${id}[${index}] line ${lineOf(branch?.loc, branch?.line)}`);
      }
    });
  }
  return issues;
}

const report = JSON.parse(readFileSync(coveragePath(), "utf8")) as Record<string, IstanbulFile>;
const failures: string[] = [];

for (const name of CORE_FILES) {
  const entry = Object.entries(report).find(([filePath, file]) =>
    isCoreFile(file.path ?? filePath, name)
  );
  if (!entry) {
    failures.push(`${name}: not present in the coverage report`);
    continue;
  }
  const issues = uncovered(entry[1]);
  if (issues.length > 0) {
    failures.push(`${name}:\n  ${issues.join("\n  ")}`);
  }
}

if (failures.length > 0) {
  console.error("Core contract coverage is below 100%:\n");
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("Core contracts are at 100% statement, branch, and function coverage.");
