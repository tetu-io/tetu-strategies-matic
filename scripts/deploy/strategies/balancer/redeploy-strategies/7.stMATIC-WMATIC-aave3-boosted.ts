import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {
  deployBalancerUniversalStrategyOnly,
  deployBalancerVaultAndUniversalStrategy
} from "../DeployVaultAndBalancerUniversalStrategy";
import {BalancerConstants} from "../BalancerConstants";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/7.stMATIC-WMATIC-aave3-boosted.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/7.stMATIC-WMATIC-aave3-boosted.ts
 */

async function main() {
  const underlying = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_GAUGE;
  const isCompound = false;
  const depositToken = MaticAddresses.stMATIC_TOKEN;
  const buyBackRatio = 8_00;

  const vault = "0x2F48C4B3a3D49d1e0F3A176eA8F558823B61a931";

  await deployBalancerUniversalStrategyOnly(
    underlying,
    poolId,
    gauge,
    isCompound,
    depositToken,
    buyBackRatio,
    BalancerConstants.BALANCER_VAULT_stMATIC_WMATIC_AAVE3_BOOSTED,
    BalancerConstants.STRATEGY_BALANCER_UNIVERSAL_LOGIC_100
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
