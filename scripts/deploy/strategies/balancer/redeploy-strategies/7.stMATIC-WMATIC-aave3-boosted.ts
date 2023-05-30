import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {
  deployBalancerUniversalStrategyOnly,
  deployBalancerVaultAndUniversalStrategy
} from "../DeployVaultAndBalancerUniversalStrategy";
import {BalancerConstants} from "../BalancerConstants";
import hre from "hardhat";
import {writeFileSync} from "fs";
import {
  deployStMaticWMaticAave3Boosted7
} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/7.stMATIC-WMATIC-aave3-boosted";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/7.stMATIC-WMATIC-aave3-boosted.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/7.stMATIC-WMATIC-aave3-boosted.ts
 */

async function main() {
  const {vault, strategy, undSymbol} = await deployStMaticWMaticAave3Boosted7();

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
