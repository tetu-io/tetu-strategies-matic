import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {
  deployBalancerUniversalStrategyOnly
} from "../../../../../scripts/deploy/strategies/balancer/DeployVaultAndBalancerUniversalStrategy";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";

export async function deployStMaticWMaticAave3Boosted7(): Promise<{vault: string, strategy: string, undSymbol: string}> {
  const underlying = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_GAUGE;
  const isCompound = false;
  const depositToken = MaticAddresses.stMATIC_TOKEN;
  const buyBackRatio = 8_00;

  return deployBalancerUniversalStrategyOnly(
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
