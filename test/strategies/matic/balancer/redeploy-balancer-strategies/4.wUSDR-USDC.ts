import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deployBalancerStrategyOnly} from "../../../../../scripts/deploy/strategies/balancer/DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";

export async function deployWUsdrUsdc4(): Promise<{vault: string, strategy: string, undSymbol: string}> {
  return deployBalancerStrategyOnly(
    MaticAddresses.BALANCER_USDC_wUSDR,
    MaticAddresses.BALANCER_USDC_wUSDR_ID,
    MaticAddresses.BALANCER_USDC_wUSDR_GAUGE,
    MaticAddresses.USDC_TOKEN,
    5_00,
    BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC_104,
    BalancerConstants.BALANCER_VAULT_wUSDR_USDC
  );
}
