import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {deployBalancerVaultAndUniversalStrategy} from "../DeployVaultAndBalancerUniversalStrategy";

async function main() {
  const underlying = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_GAUGE;
  const isCompound = false;
  const depositToken = MaticAddresses.stMATIC_TOKEN;
  const buyBackRatio = 8_00;

  await deployBalancerVaultAndUniversalStrategy(
    underlying,
    poolId,
    gauge,
    isCompound,
    depositToken,
    buyBackRatio,
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
