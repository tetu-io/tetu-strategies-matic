import {
  deployBalancerUniversalStrategyOnly
} from "../../../../../scripts/deploy/strategies/balancer/DeployVaultAndBalancerUniversalStrategy";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";

export async function deployMaticXWmaticAave3Boosted6(): Promise<{vault: string, strategy: string, undSymbol: string}> {
  const underlying = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_GAUGE;
  const isCompound = true;
  const depositToken = MaticAddresses.MATIC_X;
  const buyBackRatio = 5_00;

  return deployBalancerUniversalStrategyOnly(
    underlying,
    poolId,
    gauge,
    isCompound,
    depositToken,
    buyBackRatio,
    BalancerConstants.BALANCER_VAULT_MATICX_WMATIC_AAVE3_BOOSTED
  );
}
