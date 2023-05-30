import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import {ethers} from "hardhat";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/0.DeployBalancerBPTStrategy.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/0.DeployBalancerBPTStrategy.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const strategyLogic = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBPT");
  console.log("strategyLogic", strategyLogic.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


