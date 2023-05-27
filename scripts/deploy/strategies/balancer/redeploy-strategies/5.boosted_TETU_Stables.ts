import {deployBalancerStrategyOnly, deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {BalancerConstants} from "../BalancerConstants";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/5.boosted_TETU_Stables.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/5.boosted_TETU_Stables.ts
 */
async function main() {
  await deployBalancerStrategyOnly(
    MaticAddresses.BALANCER_USD_TETU_BOOSTED,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_ID,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_GAUGE,
    MaticAddresses.bb_t_USDC_TOKEN,
    8_00,
    BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC_104,
    BalancerConstants.BALANCER_VAULT_USD_TETU_BOOSTED
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
