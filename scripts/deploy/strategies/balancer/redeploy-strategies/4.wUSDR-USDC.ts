import {deployBalancerStrategyOnly} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {BalancerConstants} from "../BalancerConstants";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/4.wUSDR-USDC.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/4.wUSDR-USDC.ts
 */
async function main() {
  await deployBalancerStrategyOnly(
    MaticAddresses.BALANCER_USDC_wUSDR,
    MaticAddresses.BALANCER_USDC_wUSDR_ID,
    MaticAddresses.BALANCER_USDC_wUSDR_GAUGE,
    MaticAddresses.USDC_TOKEN,
    5_00,
    BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC_104,
    BalancerConstants.BALANCER_VAULT_wUSDR_USDC
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
