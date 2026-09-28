export const SEED_NETWORKS = [
  "localhost",
  "sepolia",
  "mainnet",
  "base",
  "baseSepolia",
] as const;

export type SeedNetwork = (typeof SEED_NETWORKS)[number];

export const CHAIN_ID_BY_NETWORK: Record<SeedNetwork, number> = {
  localhost: 31337,
  sepolia: 11155111,
  mainnet: 1,
  base: 8453,
  baseSepolia: 84532,
};

function isSeedNetwork(name: string): name is SeedNetwork {
  return (SEED_NETWORKS as readonly string[]).includes(name);
}

export function normalizeNetworkName(name: string): SeedNetwork {
  const resolved = name === "hardhat" ? "localhost" : name;
  if (!isSeedNetwork(resolved)) {
    throw new Error(`Unknown chain "${name}". Use: ${SEED_NETWORKS.join(", ")}`);
  }
  return resolved;
}

function chainFromArgv(argv: string[]): string | undefined {
  const flag = argv.findIndex((arg) => arg === "--chain");
  const next = flag >= 0 ? argv[flag + 1] : undefined;
  if (next && !next.startsWith("-")) return next;
  const assigned = argv.find((arg) => arg.startsWith("--chain="));
  if (assigned) return assigned.slice("--chain=".length);
  return undefined;
}

/**
 * Target chain for seed scripts: `--chain`, `SEED_CHAIN` / `CHAIN`, else Hardhat `--network`.
 * An explicit chain must match the Hardhat network so addresses and RPC stay aligned.
 */
export function resolveTargetChain(
  hreNetworkName: string,
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv
): SeedNetwork {
  const explicit = chainFromArgv(argv) ?? env.SEED_CHAIN?.trim() ?? env.CHAIN?.trim();
  const fromHardhat = normalizeNetworkName(hreNetworkName);
  if (!explicit) return fromHardhat;
  const target = normalizeNetworkName(explicit);
  if (target !== fromHardhat) {
    throw new Error(
      `Target chain is "${target}" but Hardhat network is "${hreNetworkName}". Run with --network ${target}`
    );
  }
  return target;
}

export function assertProviderChainId(target: SeedNetwork, chainId: bigint): void {
  const expected = CHAIN_ID_BY_NETWORK[target];
  if (Number(chainId) !== expected) {
    throw new Error(
      `Connected chainId ${chainId} does not match ${target} (${expected}). Run with --network ${target}`
    );
  }
}
