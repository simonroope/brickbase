/**
 * Brickbase MCP Server (stdio)
 * Exposes smart contracts, config, and property data via Model Context Protocol.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerBrickbaseTools } from "./registerTools.js";

const server = new McpServer(
  {
    name: "brickbase",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: { listChanged: true },
      resources: { listChanged: true },
    },
  }
);

registerBrickbaseTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Brickbase MCP server connected");
