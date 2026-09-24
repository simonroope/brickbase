import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_TEST_GET_TEST_FILES } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";
import { appendProjectId } from "./chains";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

subtask(TASK_TEST_GET_TEST_FILES).setAction(async (args, _hre, runSuper) => {
  const files: string[] = await runSuper(args);
  return files.filter(
    (file) => !file.endsWith(".d.ts") && !file.includes(`${path.sep}seed${path.sep}`)
  );
});

function isLoopbackRpc(url: string | undefined): boolean {
  return !url || /localhost|127\.0\.0\.1/.test(url);
}

/** Infura bases end in `/`; public RPCs do not, so the project id is not appended. */
function remoteRpcUrl(envUrl: string | undefined, infuraBase: string): string {
  const base = envUrl && !isLoopbackRpc(envUrl) ? envUrl : infuraBase;
  return base.endsWith("/") ? appendProjectId(base) : base;
}

const deployerAccounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      "viaIR": true
    }
  },
  defaultNetwork: "localhost",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: remoteRpcUrl(process.env.ETHEREUM_RPC_URL, "https://sepolia.infura.io/v3/"),
      accounts: deployerAccounts,
    },
    mainnet: {
      url: remoteRpcUrl(process.env.ETHEREUM_RPC_URL, "https://mainnet.infura.io/v3/"),
      accounts: deployerAccounts,
    },
    baseSepolia: {
      url: remoteRpcUrl(process.env.BASE_RPC_URL, "https://base-sepolia.infura.io/v3/"),
      accounts: deployerAccounts,
    },
    base: {
      url: remoteRpcUrl(process.env.BASE_RPC_URL, "https://base-mainnet.infura.io/v3/"),
      accounts: deployerAccounts,
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 200000
  }
};

export default config;

