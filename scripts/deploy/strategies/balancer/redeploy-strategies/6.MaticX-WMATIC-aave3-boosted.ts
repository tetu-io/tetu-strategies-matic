import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {
  deployBalancerUniversalStrategyOnly
} from "../DeployVaultAndBalancerUniversalStrategy";
import {BalancerConstants} from "../BalancerConstants";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/6.MaticX-WMATIC-aave3-boosted.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/6.MaticX-WMATIC-aave3-boosted.ts
 */
async function main() {
  const underlying = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_GAUGE;
  const isCompound = true;
  const depositToken = MaticAddresses.MATIC_X;
  const buyBackRatio = 5_00;

  await deployBalancerUniversalStrategyOnly(
    underlying,
    poolId,
    gauge,
    isCompound,
    depositToken,
    buyBackRatio,
    BalancerConstants.BALANCER_VAULT_MATICX_WMATIC_AAVE3_BOOSTED,
    BalancerConstants.STRATEGY_BALANCER_UNIVERSAL_LOGIC_100
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
