import {
  StrategyBalancerTetuUsdc__factory
} from "../../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../../TokenUtils";
import {RunHelper} from "../../../../../scripts/utils/tools/RunHelper";

export async function deployUsdcTetu2(signer: SignerWithAddress): Promise<{vault: string, strategy: string, undSymbol: string}> {
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const vault = BalancerConstants.BALANCER_VAULT_USDC_TETU;
  const UNDERLYING = MaticAddresses.BALANCER_TETU_USDC
  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerTetuUsdc");
  const tetuBalHolder = "0x237114ef61b27fdf57132e6c8c4244eeea8323d3"; // exist holder

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerTetuUsdc__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault,
    tetuBalHolder,
    '0x6672A074B98A7585A8549356F97dB02f9416849E' // EOA temporally
  ));

  return {vault, strategy: strategyProxy.address, undSymbol};
}
