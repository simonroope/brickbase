/**
 * Simple MCP client to test the server.
 * Run from brickbase: npx tsx apps/mcp-server/src/test-client.ts
 * Or from apps/mcp-server: npx tsx src/test-client.ts
 * Prereqs: Hardhat node running, contracts deployed, .env configured.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use monorepo root (brickbase) so server finds .env
const serverCwd = resolve(__dirname, "../../..");

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "apps/mcp-server/src/index.ts"],
  cwd: serverCwd,
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

console.log("Connected. Calling tools...\n");

try {
  const tools = await client.listTools();
  console.log("Tools:", tools.tools.map((t) => t.name).join(", "));

  // get_oracle_prices (no args)
  const prices = await client.callTool({ name: "get_oracle_prices", arguments: {} });
  console.log("\n--- get_oracle_prices ---\n", JSON.stringify(prices, null, 2));

  // get_property_list
  const list = await client.callTool({ name: "get_property_list", arguments: {} });
  console.log("\n--- get_property_list ---\n", JSON.stringify(list, null, 2));

  // config://deployments resource
  const deployments = await client.readResource({ uri: "config://deployments" });
  console.log("\n--- config://deployments ---\n", JSON.stringify(deployments, null, 2));
} finally {
  await client.close();
}
