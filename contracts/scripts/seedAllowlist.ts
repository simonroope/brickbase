export type LiveSeedAllowlistInput = {
  expectedDeployer?: string;
  usersToWhitelist?: string[];
  defaultAdmin?: string;
};

function splitEnvUsers(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Live-network allowlist: JSON, then SEED_USERS, else the connected signer. */
export function resolveLiveSeedAllowlist(
  signerAddress: string,
  config: LiveSeedAllowlistInput,
  env: NodeJS.ProcessEnv = process.env
): { expectedDeployer: string; usersToWhitelist: string[] } {
  const fromJson = (config.usersToWhitelist ?? []).filter(Boolean);
  const fromEnv = splitEnvUsers(env.SEED_USERS);
  const usersToWhitelist =
    fromJson.length > 0 ? fromJson : fromEnv.length > 0 ? fromEnv : [signerAddress];
  const expectedDeployer =
    config.expectedDeployer || config.defaultAdmin || signerAddress;
  return { expectedDeployer, usersToWhitelist };
}
