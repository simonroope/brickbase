import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import type { SkillRunner, RunSkillParams } from "../runner";
import { issueContext } from "../runner";

export class CodexRunner implements SkillRunner {
  async run({ skillPath, issue, worktreePath }: RunSkillParams): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the codex runner");
    }
    const instructions = readFileSync(skillPath, "utf-8");
    const prompt = `${instructions}\n\n---\n\n${issueContext(issue)}`;

    const promptFile = path.join(tmpdir(), `brickbase-prompt-${issue.number}.md`);
    writeFileSync(promptFile, prompt, "utf-8");

    execSync(`codex --full-auto --quiet "${promptFile}"`, {
      cwd: worktreePath,
      stdio: "inherit",
    });
  }
}
