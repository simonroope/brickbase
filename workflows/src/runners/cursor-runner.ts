import { readFileSync } from "fs";
import { Agent } from "@cursor/sdk";
import type { SkillRunner, RunSkillParams } from "../runner.js";
import { issueContext } from "../runner.js";

export class CursorRunner implements SkillRunner {
  async run({ skillPath, issue, worktreePath }: RunSkillParams): Promise<void> {
    const instructions = readFileSync(skillPath, "utf-8");
    const prompt = `${instructions}\n\n---\n\n${issueContext(issue)}`;

    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) throw new Error("CURSOR_API_KEY is required for the cursor runner");

    await using agent = await Agent.create({
      apiKey,
      model: { id: "claude-opus-4" },
      local: { cwd: worktreePath },
    });

    const run = await agent.send(prompt);

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
      }
    }

    await run.wait();
  }
}
