import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deployBalancerStrategyOnly} from "../../../../../scripts/deploy/strategies/balancer/DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";

export async function deployBoostedTetuStables5(): Promise<{vault: string, strategy: string, undSymbol: string}> {
  return deployBalancerStrategyOnly(
    MaticAddresses.BALANCER_USD_TETU_BOOSTED,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_ID,
    MaticAddresses.BALANCER_USD_TETU_BOOSTED_GAUGE,
    MaticAddresses.bb_t_USDC_TOKEN,
    8_00,
    BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC_104,
    BalancerConstants.BALANCER_VAULT_USD_TETU_BOOSTED
  );
}
