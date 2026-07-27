import { execSync } from "child_process";
import path from "path";
import type { SkillRunner } from "./runner";
import { CursorRunner } from "./runners/cursor-runner";
import { ClaudeCliRunner } from "./runners/claude-runner";
import { CodexRunner } from "./runners/codex-runner";

const REPO_ROOT = process.env.REPO_ROOT!;
const SKILL_PATH = path.join(REPO_ROOT, "skills/build-code/SKILL.md");

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
  return raw.map((i) => ({
    ...i,
    blockedBy: parseIssueRefs(i.body, "Blocked by"),
    blocks: parseIssueRefs(i.body, "Blocks"),
  }));
}

export async function createWorktree(issue: Issue): Promise<string> {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const branchName = `issue-${issue.number}-${slug}`;
  const worktreePath = path.join(REPO_ROOT, "..", `brickbase-${issue.number}`);

  execSync(
    `git worktree add -b ${branchName} ${worktreePath} main`,
    { cwd: REPO_ROOT }
  );

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
  execSync(`git worktree remove --force ${worktreePath}`, { cwd: REPO_ROOT });
}
