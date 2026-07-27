import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import type { SkillRunner, RunSkillParams } from "../runner";
import { issueContext } from "../runner";

export class CodexRunner implements SkillRunner {
  async run({ skillPath, issue, worktreePath }: RunSkillParams): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the codex runner");
    }
    const instructions = readFileSync(skillPath, "utf-8");
    const prompt = `${instructions}\n\n---\n\n${issueContext(issue)}`;

    const result = spawnSync("codex", ["--full-auto", "--quiet"], {
      cwd: worktreePath,
      input: prompt,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.status !== 0) {
      throw new Error(`Codex CLI exited with status ${result.status}`);
    }
  }
}
