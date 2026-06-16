/**
 * Brickbase MCP Server
 * stdio for local dev; HTTP (Streamable HTTP) when MCP_TRANSPORT=http (production ECS).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBrickbaseMcpServer } from "./createServer.js";
import { startHttpServer } from "./httpServer.js";

async function main() {
  const transportMode = process.env.MCP_TRANSPORT ?? "stdio";

  if (transportMode === "http") {
    await startHttpServer(createBrickbaseMcpServer);
    return;
  }

  const server = createBrickbaseMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Brickbase MCP server connected (stdio)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
