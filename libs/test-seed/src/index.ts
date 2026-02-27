/**
 * @brickbase/test-seed - Shared seeding for MCP and web e2e tests.
 * Seeds users (whitelist) and assets into deployed contracts via viem.
 * Independent of contracts scripts/seed-*.ts (which use Hardhat).
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { deployerAccount, signer1, agentAccount } from "./hardhat-accounts.js";
import { assetVaultAbi, assetSharesAbi } from "../../abi/src/index";

const localhost = {
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
} as const;

const USDC_6 = BigInt(1e6);

const ASSET_1 = {
  assetId: 1,
  status: 0,
  capitalValue: BigInt(155_000_000) * USDC_6,
  incomeValue: BigInt(500_000) * USDC_6,
  metadataURI:
    "https://ivory-independent-bison-569.mypinata.cloud/ipfs/bafkreih6m7alojklbblqvtuhizkduouuepawfpax2jexuac4w5xse2amby",
  totalSupply: BigInt(10_000) * BigInt(1e18),
  sharePrice: BigInt(2) * USDC_6,
};

const ASSET_2 = {
  assetId: 2,
  status: 0,
  capitalValue: BigInt(102_000_000) * USDC_6,
  incomeValue: BigInt(550_000) * USDC_6,
  metadataURI:
    "https://ivory-independent-bison-569.mypinata.cloud/ipfs/bafkreibsqx5frs2ke2hjvm3rra3fpcvikdnolipups7kacp5ossygehkc4",
  totalSupply: BigInt(25_000) * BigInt(1e18),
  sharePrice: BigInt(2.51 * 1e6),
  sharesToPurchase: BigInt(1_000) * BigInt(1e18),
  tradingEnabled: true,
};

export type SeedOptions = {
  rpcUrl: string;
  assetVault: Address;
  assetShares: Address;
  usdc: Address;
  deployerPrivateKey?: `0x${string}`;
};

async function _seedUsersAndAssets(options: SeedOptions): Promise<void> {
  const { rpcUrl, assetVault, assetShares, usdc, deployerPrivateKey } = options;

  const chain = { ...localhost, rpcUrls: { default: { http: [rpcUrl] } } };
  const account = deployerPrivateKey
    ? privateKeyToAccount(deployerPrivateKey)
    : deployerAccount;
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const usersToWhitelist: Address[] = [
    signer1.address,
    agentAccount.address,
    "0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e" as Address,
  ];

  const MINTER_ROLE = keccak256(encodePacked(["string"], ["MINTER_ROLE"]));

  // 1. Whitelist users
  for (const user of usersToWhitelist) {
    try {
      const hash = await walletClient.writeContract({
        address: assetShares,
        abi: assetSharesAbi as never[],
        functionName: "setUserAllowed",
        args: [user, true],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already") && !msg.includes("User already")) throw e;
    }
  }

  // 2. Grant MINTER_ROLE to deployer on AssetShares if needed
  const hasMinter = await publicClient.readContract({
    address: assetShares,
    abi: assetSharesAbi as never[],
    functionName: "hasRole",
    args: [MINTER_ROLE, account.address],
  });
  if (!hasMinter) {
    const hash = await walletClient.writeContract({
      address: assetShares,
      abi: assetSharesAbi as never[],
      functionName: "grantRole",
      args: [MINTER_ROLE, account.address],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // 3. Create asset 1 in AssetVault
  try {
    const hash = await walletClient.writeContract({
      address: assetVault,
      abi: assetVaultAbi as never[],
      functionName: "createAsset",
      args: [
        BigInt(ASSET_1.assetId),
        ASSET_1.status,
        ASSET_1.capitalValue,
        ASSET_1.incomeValue,
        ASSET_1.metadataURI,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("already exists") && !msg.includes("already exist")) throw e;
  }

  // 4. Create ShareInfo for asset 1
  try {
    const hash = await walletClient.writeContract({
      address: assetShares,
      abi: assetSharesAbi as never[],
      functionName: "createAssetShares",
      args: [BigInt(ASSET_1.assetId), ASSET_1.totalSupply, ASSET_1.sharePrice],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists") && !msg.includes("already exist")) throw e;
  }

  // 5. Create asset 2 in AssetVault
  try {
    const hash = await walletClient.writeContract({
      address: assetVault,
      abi: assetVaultAbi as never[],
      functionName: "createAsset",
      args: [
        BigInt(ASSET_2.assetId),
        ASSET_2.status,
        ASSET_2.capitalValue,
        ASSET_2.incomeValue,
        ASSET_2.metadataURI,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("already exists") && !msg.includes("already exist")) throw e;
  }

  // 6. Create ShareInfo for asset 2, enable trading
  try {
    const hash1 = await walletClient.writeContract({
      address: assetShares,
      abi: assetSharesAbi as never[],
      functionName: "createAssetShares",
      args: [BigInt(ASSET_2.assetId), ASSET_2.totalSupply, ASSET_2.sharePrice],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash1 });
    const hash2 = await walletClient.writeContract({
      address: assetShares,
      abi: assetSharesAbi as never[],
      functionName: "setTradingEnabled",
      args: [BigInt(ASSET_2.assetId), ASSET_2.tradingEnabled],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash2 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists") && !msg.includes("already exist")) throw e;
  }

  // 7. Fund agent (Hardhat #2) with USDC
  const erc20Abi = [
    {
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;
  const agentUsdc = BigInt(1_000) * USDC_6;
  const hash = await walletClient.writeContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "transfer",
    args: [agentAccount.address, agentUsdc],
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

export const seedUsersAndAssets = _seedUsersAndAssets;
export { agentAccount } from "./hardhat-accounts.js";
export default { seedUsersAndAssets };
