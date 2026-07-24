import { Client, Connection } from "@temporalio/client";

async function main(): Promise<void> {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  const handle = await client.workflow.start("buildCodeFromIssuesWorkflow", {
    taskQueue: "build-code-queue",
    workflowId: `build-code-scan-${Date.now()}`,
  });

  console.log(`Workflow started: ${handle.workflowId}`);
  await handle.result();
  console.log("All issues processed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
