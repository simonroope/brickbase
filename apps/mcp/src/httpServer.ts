import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

function requestPath(req: IncomingMessage): string {
  return (req.url ?? "/").split("?")[0] ?? "/";
}

export async function startHttpServer(createMcp: () => McpServer): Promise<void> {
  const port = Number(process.env.MCP_PORT ?? "3100");

  const httpServer = createServer(async (req, res) => {
    const path = requestPath(req);

    if (req.method === "GET" && path === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (path === "/mcp" || path.startsWith("/mcp/")) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      const server = createMcp();
      await server.connect(transport);

      const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, "0.0.0.0", () => resolve());
  });

  console.error(`Brickbase MCP HTTP server listening on 0.0.0.0:${port}`);
}
