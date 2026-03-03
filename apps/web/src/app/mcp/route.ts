/**
 * Brickbase MCP endpoint at /mcp
 * Streamable HTTP transport for AI agents and MCP clients.
 */
import { createMcpHandler } from "mcp-handler";
import { registerBrickbaseTools } from "@brickbase/mcp/registerTools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const handler = createMcpHandler(
  (server: McpServer) => {
    registerBrickbaseTools(server);
  },
  {},
  {
    basePath: "",
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST };
