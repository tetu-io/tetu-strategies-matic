import {deployBalancerStrategyOnly, deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {BalancerConstants} from "../BalancerConstants";
import hre from "hardhat";
import {writeFileSync} from "fs";
import {
  deployBoostedTetuStables5
} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/5.boosted_TETU_Stables";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/5.boosted_TETU_Stables.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/5.boosted_TETU_Stables.ts
 */
async function main() {
  const {vault, strategy, undSymbol} = await deployBoostedTetuStables5();

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
