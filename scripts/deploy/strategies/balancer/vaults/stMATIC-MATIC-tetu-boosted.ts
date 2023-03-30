import {deployBalancerVaultAndStrategy} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";

async function main() {
  await deployBalancerVaultAndStrategy(
    MaticAddresses.BALANCER_stMATIC_WMATIC_TETU_BOOSTED,
    MaticAddresses.BALANCER_stMATIC_WMATIC_TETU_BOOSTED_ID,
    MaticAddresses.BALANCER_stMATIC_WMATIC_TETU_BOOSTED_GAUGE,
    MaticAddresses.WMATIC_TOKEN,
    8_00
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
