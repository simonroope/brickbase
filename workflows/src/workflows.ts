import {
  proxyActivities,
  executeChild,
  ParentClosePolicy,
} from "@temporalio/workflow";
import type * as activities from "./activities";
import type { Issue } from "./activities";

const {
  fetchReadyForAgentIssues,
  createWorktree,
  runBuildCodeAgent,
  raisePullRequest,
  commentOnIssue,
  removeWorktree,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 hours",
  retry: { maximumAttempts: 2 },
});

/**
 * Handles a single issue end-to-end:
 * create worktree → run build-code agent → raise PR → cleanup
 */
export async function buildCodeForIssueWorkflow(issue: Issue): Promise<void> {
  const worktreePath = await createWorktree(issue);

  try {
    await runBuildCodeAgent(issue, worktreePath);
    const prUrl = await raisePullRequest(issue, worktreePath);
    await commentOnIssue(issue.number, prUrl);
  } finally {
    await removeWorktree(worktreePath);
  }
}

/**
 * Entry point: scans the ticket tracker for ready-for-agent issues
 * and fans out a child workflow per issue, running them in parallel.
 */
export async function buildCodeFromIssuesWorkflow(): Promise<void> {
  const issues = await fetchReadyForAgentIssues();

  await Promise.all(
    issues.map((issue) =>
      executeChild(buildCodeForIssueWorkflow, {
        args: [issue],
        workflowId: `build-code-issue-${issue.number}`,
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
      })
    )
  );
}
