import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_USDC_wUSDR,
    MaticAddresses.BALANCER_USDC_wUSDR_ID,
    MaticAddresses.BALANCER_USDC_wUSDR_GAUGE,
    MaticAddresses.USDC_TOKEN,
    5_00
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
