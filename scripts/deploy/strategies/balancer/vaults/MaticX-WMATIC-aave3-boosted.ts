import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {deployBalancerVaultAndUniversalStrategy} from "../DeployVaultAndBalancerUniversalStrategy";

async function main() {
  const underlying = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_GAUGE;
  const isCompound = true;
  const depositToken = MaticAddresses.MATIC_X;
  const buyBackRatio = 5_00;

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
