import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import type { SkillRunner, RunSkillParams } from "../runner";
import { issueContext } from "../runner";

export class ClaudeCliRunner implements SkillRunner {
  async run({ skillPath, issue, worktreePath }: RunSkillParams): Promise<void> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for the claude runner");
    }
    const instructions = readFileSync(skillPath, "utf-8");
    const prompt = `${instructions}\n\n---\n\n${issueContext(issue)}`;

    const result = spawnSync("claude", ["--print", "--dangerously-skip-permissions"], {
      cwd: worktreePath,
      input: prompt,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.status !== 0) {
      throw new Error(`Claude CLI exited with status ${result.status}`);
    }
  }
}
