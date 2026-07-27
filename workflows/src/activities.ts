import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { rimrafSync } from "rimraf";
import type { SkillRunner } from "./runner";
import { CursorRunner } from "./runners/cursor-runner";
import { ClaudeCliRunner } from "./runners/claude-runner";
import { CodexRunner } from "./runners/codex-runner";

const REPO_ROOT = process.env.REPO_ROOT!;
const SKILL_PATH = path.join(REPO_ROOT, "skills/build-code/SKILL.md");

/**
 * Reliably delete a directory tree (including stubborn npm node_modules on macOS).
 * `rm -rf` often fails with "Directory not empty"; rimraf retries through that.
 */
function forceRemoveDir(dir: string): void {
  if (!existsSync(dir)) return;
  try {
    execSync(`chmod -R u+w "${dir}"`, { stdio: "pipe" });
  } catch {
    /* best-effort — some paths may already be gone mid-delete */
  }
  rimrafSync(dir, { maxRetries: 15, retryDelay: 200 });
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  /** Issue numbers this ticket cannot start until they are complete. */
  blockedBy: number[];
  /** Issue numbers that cannot start until this ticket is complete. */
  blocks: number[];
}

/**
 * Parse issue numbers from a named markdown section, e.g.:
 *   ## Blocked by
 *   - #12
 *   - #15
 */
function parseIssueRefs(body: string, heading: string): number[] {
  const re = new RegExp(`##\\s+${heading}[\\s\\S]*?(?=##|$)`, "i");
  const section = body.match(re)?.[0] ?? "";
  return [...section.matchAll(/#(\d+)/g)].map((m) => parseInt(m[1], 10));
}

function createRunner(): SkillRunner {
  switch (process.env.SKILL_RUNNER ?? "claude") {
    case "cursor":  return new CursorRunner();
    case "codex":   return new CodexRunner();
    default:        return new ClaudeCliRunner();
  }
}

export async function fetchReadyForAgentIssues(): Promise<Issue[]> {
  const json = execSync(
    `gh issue list --label ready-for-agent --state open --json number,title,body`,
    { cwd: REPO_ROOT }
  ).toString();
  const raw: { number: number; title: string; body: string }[] = JSON.parse(json);

  // Skip issues that already have an open PR to avoid reprocessing on re-trigger.
  const prJson = execSync(
    `gh pr list --state open --json number,title,body`,
    { cwd: REPO_ROOT }
  ).toString();
  const openPrs: { body: string }[] = JSON.parse(prJson);
  // Match "Closes #N" anywhere in the PR body (not a section heading).
  const closesRe = /closes\s+#(\d+)/gi;
  const issuesWithPr = new Set(
    openPrs.flatMap((pr) =>
      [...pr.body.matchAll(closesRe)].map((m) => parseInt(m[1], 10))
    )
  );

  return raw
    .filter((i) => !issuesWithPr.has(i.number))
    .map((i) => ({
      ...i,
      blockedBy: parseIssueRefs(i.body, "Blocked by"),
      blocks: parseIssueRefs(i.body, "Blocks"),
    }));
}

export async function createWorktree(issue: Issue): Promise<string> {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, ""); // strip trailing dashes from mid-word truncation
  const branchName = `issue-${issue.number}-${slug}`;
  const worktreePath = path.resolve(REPO_ROOT, "..", `brickbase-${issue.number}`);

  // Clean up any leftover artefacts from a previous failed run.
  try {
    execSync(`git worktree remove --force ${worktreePath}`, { cwd: REPO_ROOT, stdio: "pipe" });
  } catch { /* worktree not registered */ }

  forceRemoveDir(worktreePath);
  execSync("git worktree prune", { cwd: REPO_ROOT });

  try {
    execSync(`git branch -D ${branchName}`, { cwd: REPO_ROOT, stdio: "pipe" });
  } catch { /* branch did not exist */ }

  execSync(
    `git worktree add -b ${branchName} ${worktreePath} main`,
    { cwd: REPO_ROOT }
  );

  // Fresh install in the worktree (npm ci — lockfile-driven, no symlink to main checkout).
  execSync("npm ci", { cwd: worktreePath, stdio: "inherit" });
  execSync("npm ci", { cwd: path.join(worktreePath, "apps/web"), stdio: "inherit" });
  execSync("npm ci", { cwd: path.join(worktreePath, "apps/events"), stdio: "inherit" });

  return worktreePath;
}

export async function runBuildCodeAgent(
  issue: Issue,
  worktreePath: string
): Promise<void> {
  const runner = createRunner();
  await runner.run({ skillPath: SKILL_PATH, issue, worktreePath });
}

export async function raisePullRequest(
  issue: Issue,
  worktreePath: string
): Promise<string> {
  // Commit any uncommitted changes the agent left behind.
  const status = execSync("git status --porcelain", { cwd: worktreePath }).toString().trim();
  if (status) {
    execSync('git add -A && git commit -m "chore: apply agent changes"', { cwd: worktreePath });
  }

  // gh pr create requires the branch to exist on the remote first.
  execSync("git push -u origin HEAD", { cwd: worktreePath });

  // Ensure the label exists in the repo (idempotent — no-ops if already present).
  try {
    execSync("gh label create ready-for-human --color 0075ca --description 'Requires human implementation'", {
      cwd: worktreePath,
      stdio: "pipe",
    });
  } catch { /* label already exists */ }

  const prUrl = execSync(
    `gh pr create \
      --title "${issue.title}" \
      --body "Closes #${issue.number}\\n\\nBuilt by automated build-code workflow." \
      --label ready-for-human`,
    { cwd: worktreePath }
  )
    .toString()
    .trim();

  return prUrl;
}

export async function commentOnIssue(
  issueNumber: number,
  prUrl: string
): Promise<void> {
  execSync(
    `gh issue comment ${issueNumber} --body "PR raised: ${prUrl}. Ready for human review."`,
    { cwd: REPO_ROOT }
  );
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  // Unregister the worktree if git still knows about it (may already be gone on retry).
  try {
    execSync(`git worktree remove --force ${worktreePath}`, {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
  } catch {
    /* not registered, or remove left files behind (e.g. node_modules from npm ci) */
  }

  forceRemoveDir(worktreePath);
  execSync("git worktree prune", { cwd: REPO_ROOT });
}
