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
 * Run one tier (set of issues with no outstanding blockers) in parallel.
 * Returns when every issue in the tier has completed.
 */
async function runTier(tier: Issue[]): Promise<void> {
  await Promise.all(
    tier.map((issue) =>
      executeChild(buildCodeForIssueWorkflow, {
        args: [issue],
        workflowId: `build-code-issue-${issue.number}`,
        parentClosePolicy: ParentClosePolicy.ABANDON,
      })
    )
  );
}

/**
 * Entry point: scans the ticket tracker for ready-for-agent issues, builds a
 * dependency graph from their "Blocked by" / "Blocks" fields, then executes
 * them tier by tier — issues with no outstanding blockers run in parallel, and
 * each tier is released only after all its prerequisites have completed.
 *
 * Tickets whose blockers are not in the ready-for-agent set (e.g. already
 * closed or differently labelled) are treated as satisfied so they are not
 * held indefinitely.
 */
export async function buildCodeFromIssuesWorkflow(): Promise<void> {
  const issues = await fetchReadyForAgentIssues();

  const inSet = new Set(issues.map((i) => i.number));
  const completed = new Set<number>();
  const remaining = new Set(issues.map((i) => i.number));
  const byNumber = new Map(issues.map((i) => [i.number, i]));

  while (remaining.size > 0) {
    // A ticket is ready when every blocker is either completed or outside
    // the ready-for-agent set (already done or not managed here).
    const tier = [...remaining]
      .map((n) => byNumber.get(n)!)
      .filter((issue) =>
        issue.blockedBy.every((b) => completed.has(b) || !inSet.has(b))
      );

    if (tier.length === 0) {
      // Remaining tickets all block each other — circular dependency.
      const stuck = [...remaining].join(", ");
      throw new Error(
        `Dependency cycle or unresolvable blockers among issues: ${stuck}`
      );
    }

    await runTier(tier);

    for (const issue of tier) {
      completed.add(issue.number);
      remaining.delete(issue.number);
    }
  }
}
