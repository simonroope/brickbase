import type { Issue } from "./activities";

export interface RunSkillParams {
  skillPath: string;
  issue: Issue;
  worktreePath: string;
}

export interface SkillRunner {
  run(params: RunSkillParams): Promise<void>;
}

export function issueContext(issue: Issue): string {
  return `You are working on issue #${issue.number}: "${issue.title}"

${issue.body}

Work in the current directory. When the TDD loop and code-review are complete,
commit all changes to the current branch.

Do NOT run \`gh pr create\` or open a pull request yourself. A Temporal workflow
activity raises the PR after you finish — that is required end-to-end. Leaving
PR creation to the orchestrator is correct completion, not a skipped requirement.
Do not report "PR not raised" as unfinished work.`.trim();
}
