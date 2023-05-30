import {
  StrategyBalancerSphereWmatic__factory
} from "../../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../../TokenUtils";
import {RunHelper} from "../../../../../scripts/utils/tools/RunHelper";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";

export async function deployTngblUsdc3(signer: SignerWithAddress): Promise<{vault: string, strategy: string, undSymbol: string}> {
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const vault = BalancerConstants.BALANCER_VAULT_TNGBL_USDC;
  const UNDERLYING = MaticAddresses.BALANCER_TNGBL_USDC

  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerTngblUsdc");

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerSphereWmatic__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault
  ));

  return {vault, strategy: strategyProxy.address, undSymbol};
}