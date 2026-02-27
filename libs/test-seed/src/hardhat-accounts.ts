import { mnemonicToAccount } from "viem/accounts";
import { HARDHAT_MNEMONIC } from "./hardhat-mnemonic.js";

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
