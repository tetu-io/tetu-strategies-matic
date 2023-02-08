import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_tetuQi_QI,
    MaticAddresses.BALANCER_tetuQi_QI_ID,
    MaticAddresses.BALANCER_tetuQi_QI_GAUGE,
    MaticAddresses.QI_TOKEN,
    2_00
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
