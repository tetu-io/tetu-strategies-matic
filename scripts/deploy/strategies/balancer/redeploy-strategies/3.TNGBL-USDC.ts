import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import hre, {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import {TokenUtils} from "../../../../../test/TokenUtils";
import {RunHelper} from "../../../../utils/tools/RunHelper";
import {
  ISmartVault__factory, StrategyBalancerSphereWmatic__factory,
  StrategyBalancerStMaticWmatic__factory
} from "../../../../../typechain";
import {BalancerConstants} from "../BalancerConstants";
import {writeFileSync} from "fs";
import {deployUsdcTetu2} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/2.USDC-TETU";
import {
  deployTngblUsdc3
} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/3.TNGBL-USDC";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/3.TNGBL-USDC.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/3.TNGBL-USDC.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const {vault, strategy, undSymbol} = await deployTngblUsdc3(signer);
  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategy}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
