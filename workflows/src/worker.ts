import { Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run(): Promise<void> {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: "build-code-queue",
  });

  console.log("Worker started on task queue: build-code-queue");
  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
