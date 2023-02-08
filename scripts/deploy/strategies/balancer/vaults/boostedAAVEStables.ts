import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_bbamUSD,
    MaticAddresses.BALANCER_bbamUSD_ID,
    MaticAddresses.BALANCER_bbamUSD_GAUGE,
    MaticAddresses.bbamUSDC_TOKEN,
    2_00
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
