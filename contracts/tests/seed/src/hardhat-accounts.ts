import { mnemonicToAccount } from "viem/accounts";

/** Well-known Hardhat development mnemonic. Safe for tests only. */
export const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

export function getHardhatSigners() {
  return [0, 1, 2].map((addressIndex) =>
    mnemonicToAccount(HARDHAT_MNEMONIC, {
      accountIndex: 0,
      changeIndex: 0,
      addressIndex,
    })
  );
}

const [deployerAccount, signer1, agentAccount] = getHardhatSigners();
export { deployerAccount, signer1, agentAccount };
export default { HARDHAT_MNEMONIC, getHardhatSigners, deployerAccount, signer1, agentAccount };
