import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_xMATIC_MATIC,
    MaticAddresses.BALANCER_xMATIC_MATIC_ID,
    MaticAddresses.BALANCER_xMATIC_MATIC_GAUGE,
    MaticAddresses.WMATIC_TOKEN,
    2_00
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
