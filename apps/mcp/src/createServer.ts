import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBrickbaseTools } from "./registerTools.js";

export function createBrickbaseMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "brickbase",
      version: "1.0.0",
    },
    {
      capabilities: { tools: {}, resources: {} },
    }
  );

  registerBrickbaseTools(server);
  return server;
}
