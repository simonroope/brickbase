/**
 * MCP server tests using Playwright Test.
 * Run: npx nx run mcp:test:mcp
 *
 * Uses MCP_USE_MOCKS=1 for read-only tools (no blockchain required).
 * The purchase_asset_shares test is skipped when mocking (requires real chain).
 */
import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverCwd = resolve(__dirname, "../../..");
dotenv.config({ path: resolve(serverCwd, ".env") });

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

const useMocks = process.env.MCP_USE_MOCKS === "1";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";
const agentAccount = mnemonicToAccount(HARDHAT_MNEMONIC, {
  accountIndex: 0,
  changeIndex: 0,
  addressIndex: 2,
});

const localhost = {
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
} as const;

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const assetVaultAddress = (process.env.NEXT_PUBLIC_ASSET_VAULT_ADDRESS ||
  "") as Address;
const assetSharesAddress = (process.env.NEXT_PUBLIC_ASSET_SHARES_ADDRESS ||
  "") as Address;
const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "") as Address;

const erc1155BalanceOfAbi = parseAbi([
  "function balanceOf(address owner, uint256 id) view returns (uint256)",
]);

let client: Client;

test.beforeAll(async () => {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "apps/mcp/src/index.ts"],
    cwd: serverCwd,
    env: { ...process.env, MCP_USE_MOCKS: "1" },
  });
  client = new Client({ name: "mcp-test", version: "1.0.0" });
  await client.connect(transport);
});

test.afterAll(async () => {
  await client.close();
});

test.describe("MCP Server Tools", () => {
  test("lists expected tools", async () => {
    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    const expectedTools = [
      "get_oracle_prices",
      "get_asset_list",
      "get_asset_detail",
      "purchase_asset_shares",
      "get_user_whitelist_status",
      "get_user_shares",
    ];
    for (const name of expectedTools) {
      expect(toolNames).toContain(name);
    }
  });

  test("get_oracle_prices returns valid prices", async () => {
    const result = await client.callTool({ name: "get_oracle_prices", arguments: {} });
    const content = Array.isArray(result.content) ? result.content[0] : undefined;
    expect(content?.type).toBe("text");
    const prices = JSON.parse((content as { text: string }).text) as Record<string, string>;
    expect(prices).toHaveProperty("ethUsd");
    expect(prices).toHaveProperty("gbpUsd");
    expect(parseInt(prices.ethUsd, 10)).toBeGreaterThan(0);
  });

  test("get_asset_list returns assets with required fields", async () => {
    const result = await client.callTool({ name: "get_asset_list", arguments: {} });
    const content = Array.isArray(result.content) ? result.content[0] : undefined;
    expect(content?.type).toBe("text");
    const properties = JSON.parse((content as { text: string }).text) as Array<Record<string, unknown>>;
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThanOrEqual(1);
    for (const p of properties) {
      expect(p).toHaveProperty("assetId");
      expect(p).toHaveProperty("sharePrice");
      expect(p).toHaveProperty("availableSupply");
    }
  });
});

test.describe("MCP Server Resources", () => {
  test("config://deployments returns chain and contract addresses", async () => {
    const deployments = await client.readResource({ uri: "config://deployments" });
    const contents = deployments.contents ?? [];
    expect(contents.length).toBeGreaterThanOrEqual(1);
    const deploymentsText = (contents[0] as { text?: string })?.text;
    expect(typeof deploymentsText).toBe("string");
    const config = JSON.parse(deploymentsText!) as Record<string, unknown>;
    expect(config).toHaveProperty("chainId");
    expect(config).toHaveProperty("rpcUrl");
    expect(config).toHaveProperty("assetShares");
    expect(config).toHaveProperty("usdc");
  });
});

test.describe("purchase_asset_shares", () => {
  test.skip(
    useMocks || !assetSharesAddress || !usdcAddress || !assetVaultAddress,
    useMocks ? "Skipped: requires real chain (run without MCP_USE_MOCKS for integration)" : "Skipped: contract addresses not set in .env"
  );

  test("returns approve and purchase transactions, agent can purchase shares", async () => {
    const account = agentAccount;
    const walletClient = createWalletClient({
      account,
      chain: localhost,
      transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
      chain: localhost,
      transport: http(rpcUrl),
    });

    const assetId = 1;
    const amount = "5";

    const balanceBefore = await publicClient.readContract({
      address: assetSharesAddress,
      abi: erc1155BalanceOfAbi,
      functionName: "balanceOf",
      args: [account.address, BigInt(assetId)],
    });

    const result = await client.callTool({
      name: "purchase_asset_shares",
      arguments: { assetId, amount },
    });

    const content = Array.isArray(result.content) ? result.content[0] : undefined;
    expect(content?.type).toBe("text");
    const payload = JSON.parse((content as { text: string }).text) as {
      error?: string;
      transactions?: Array<{ step: string; to: string; data: string; value: string }>;
    };
    expect(payload.error).toBeFalsy();
    const txs = payload.transactions ?? [];
    expect(txs.length).toBeGreaterThanOrEqual(2);
    expect(txs[0].step).toBe("approve_usdc");
    expect(txs[1].step).toBe("purchase_asset_shares");

    for (const tx of txs) {
      const hash = await walletClient.sendTransaction({
        to: tx.to as Address,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value),
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }

    const balanceAfter = await publicClient.readContract({
      address: assetSharesAddress,
      abi: erc1155BalanceOfAbi,
      functionName: "balanceOf",
      args: [account.address, BigInt(assetId)],
    });

    const expectedIncrease = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const actualIncrease = balanceAfter - balanceBefore;
    expect(actualIncrease).toBe(expectedIncrease);
  });
});
