/**
 * Brickbase MCP endpoint at /mcp
 * Streamable HTTP transport for AI agents and MCP clients.
 * Uses SDK directly to avoid mcp-handler Hono/Response conflicts (see vercel/mcp-handler#139).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerBrickbaseTools } from "@brickbase/mcp/registerTools";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handler(request: Request): Promise<Response> {
  const server = new McpServer(
    { name: "brickbase", version: "1.0.0" },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true },
      },
    }
  );
  registerBrickbaseTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);

  return transport.handleRequest(request);
}

export { handler as GET, handler as POST };
