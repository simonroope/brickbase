import { run } from "hardhat";

async function main() {
  const address = process.env.VERIFY_CONTRACT_ADDRESS;
  const constructorArgs = process.env.VERIFY_CONSTRUCTOR_ARGS
    ? JSON.parse(process.env.VERIFY_CONSTRUCTOR_ARGS)
    : [];

  if (!address) {
    throw new Error("VERIFY_CONTRACT_ADDRESS env var not set");
  }

  await run("verify:verify", {
    address,
    constructorArguments: constructorArgs
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

