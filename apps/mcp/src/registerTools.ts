/**
 * Brickbase MCP tools and resources registration.
 * Shared between stdio (CLI) and HTTP (Next.js) transports.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getOraclePrices,
  getAssetList,
  getAssetDetail,
  getUserShareBalance,
  isUserWhitelisted,
  getWhitelistedUsers,
  preparePurchaseTransactions,
  config,
} from "./contracts";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const abiDir = resolve(__dirname, "../../../libs/abi/src/generated");

function readAbi(name: string): string {
  const p = resolve(abiDir, `${name}.json`);
  const raw = readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as { abi: unknown };
  return JSON.stringify(parsed.abi, null, 2);
}

export function registerBrickbaseTools(server: McpServer): void {
  // --- Tools ---

  server.registerTool("get_asset_list", {
    title: "Get Asset List",
    description: "Fetch all tokenized assets from the AssetVault",
    inputSchema: {},
  }, async () => {
    const assets = await getAssetList();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(assets, null, 2),
        },
      ],
    };
  });

  server.registerTool("get_asset_detail", {
    title: "Get Asset Detail",
    description: "Fetch detailed info for a specific asset by ID",
    inputSchema: {
      assetId: z.number().int().min(0).describe("Asset ID"),
    },
  }, async ({ assetId }) => {
    const asset = await getAssetDetail(assetId);
    if (!asset) {
      return {
        content: [{ type: "text", text: `Asset ${assetId} not found` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(asset, null, 2) }],
    };
  });

  server.registerTool("get_oracle_prices", {
    title: "Get Oracle Prices",
    description: "Fetch ETH/USD, GBP/USD, Gold/USD, and FTSE 100 prices from the OracleRouter",
    inputSchema: {},
  }, async () => {
    const prices = await getOraclePrices();
    if (!prices) {
      return {
        content: [{ type: "text", text: "Oracle router not configured or RPC unavailable" }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ethUsd: prices.ethUsd.price.toString(),
              gbpUsd: prices.gbpUsd.price.toString(),
              goldUsd: prices.goldUsd.price.toString(),
              ftse100: prices.ftse100.value.toString(),
            },
            null,
            2
          ),
        },
      ],
    };
  });

  server.registerTool("get_user_whitelist_status", {
    title: "Get User Whitelist Status",
    description: "Check if an Ethereum address is whitelisted to interact with assets",
    inputSchema: {
      address: z.string().describe("Ethereum address (0x...)"),
    },
  }, async ({ address }) => {
    const allowed = await isUserWhitelisted(address as `0x${string}`);
    return {
      content: [{ type: "text", text: JSON.stringify({ address, whitelisted: allowed }) }],
    };
  });

  server.registerTool("get_user_shares", {
    title: "Get User Shares",
    description: "Get a user's share balance for a specific asset",
    inputSchema: {
      address: z.string().describe("Ethereum address (0x...)"),
      assetId: z.number().int().min(0).describe("Asset ID"),
    },
  }, async ({ address, assetId }) => {
    const balance = await getUserShareBalance(address as `0x${string}`, assetId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ address, assetId, balance }),
        },
      ],
    };
  });

  server.registerTool("get_whitelisted_users", {
    title: "Get Whitelisted Users",
    description: "List all currently whitelisted user addresses",
    inputSchema: {},
  }, async () => {
    const users = await getWhitelistedUsers();
    return {
      content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
    };
  });

  server.registerTool("purchase_shares", {
    title: "Purchase Shares",
    description:
      "Prepare unsigned transactions to purchase property shares. Returns transaction payloads (approve USDC, then purchaseShares) for the agent to sign with its own private key. The agent's wallet must be whitelisted and have sufficient USDC. For web users, use the web app to sign directly.",
    inputSchema: {
      assetId: z.number().int().min(0).describe("Asset ID to purchase shares for"),
      amount: z.string().describe("Number of shares to purchase (e.g. '100' for 100 shares)"),
    },
  }, async ({ assetId, amount }) => {
    const amountParsed = amount.trim();
    if (!amountParsed || !/^\d+(\.\d+)?$/.test(amountParsed)) {
      return {
        content: [{ type: "text", text: "Amount must be a positive number (e.g. '100')" }],
        isError: true,
      };
    }
    const amountRaw = BigInt(Math.floor(parseFloat(amountParsed) * 1e18));
    if (amountRaw === BigInt(0)) {
      return {
        content: [{ type: "text", text: "Amount must be greater than zero" }],
        isError: true,
      };
    }
    const result = await preparePurchaseTransactions(assetId, amountRaw);
    if (!result.success) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: result.error }) }],
        isError: true,
      };
    }
    const payload = {
      chainId: result.chainId,
      rpcUrl: result.rpcUrl,
      sharePrice: result.sharePrice,
      assetId,
      amount: amountParsed,
      transactions: result.transactions.map((t) => ({
        step: t.step,
        to: t.to,
        data: t.data,
        value: t.value.toString(),
      })),
      instructions:
        "Sign and submit these two transactions in order (1. approve USDC, 2. purchaseShares) using the agent's own wallet. The MCP server does not hold private keys.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  });

  // --- Resources ---

  server.registerResource(
    "contract-abi-AssetVault",
    "contract://AssetVault/abi",
    { description: "AssetVault contract ABI", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "contract://AssetVault/abi",
          mimeType: "application/json",
          text: readAbi("AssetVault"),
        },
      ],
    })
  );

  server.registerResource(
    "contract-abi-AssetShares",
    "contract://AssetShares/abi",
    { description: "AssetShares contract ABI", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "contract://AssetShares/abi",
          mimeType: "application/json",
          text: readAbi("AssetShares"),
        },
      ],
    })
  );

  server.registerResource(
    "contract-abi-OracleRouter",
    "contract://OracleRouter/abi",
    { description: "OracleRouter contract ABI", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "contract://OracleRouter/abi",
          mimeType: "application/json",
          text: readAbi("OracleRouter"),
        },
      ],
    })
  );

  server.registerResource(
    "contract-abi-AssetUserAllowList",
    "contract://AssetUserAllowList/abi",
    { description: "AssetUserAllowList contract ABI", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "contract://AssetUserAllowList/abi",
          mimeType: "application/json",
          text: readAbi("AssetUserAllowList"),
        },
      ],
    })
  );

  server.registerResource(
    "config-deployments",
    "config://deployments",
    { description: "Deployed contract addresses and chain config", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "config://deployments",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              chainId: config.chainId,
              rpcUrl: config.rpcUrl,
              assetVault: config.assetVaultAddress,
              assetShares: config.assetSharesAddress,
              oracleRouter: config.oracleRouterAddress,
              userAllowList: config.userAllowListAddress,
              usdc: config.usdcAddress,
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
