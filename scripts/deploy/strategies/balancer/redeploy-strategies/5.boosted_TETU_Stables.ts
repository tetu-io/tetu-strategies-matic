import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {BalancerConstants} from "../BalancerConstants";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_USD_TETU_BOOSTED,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_ID,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_GAUGE,
    MaticAddresses.bb_t_USDC_TOKEN,
    8_00,
    BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
