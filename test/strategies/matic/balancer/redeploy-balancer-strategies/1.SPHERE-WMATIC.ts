import {
  StrategyBalancerSphereWmatic__factory
} from "../../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {RunHelper} from "../../../../../scripts/utils/tools/RunHelper";
import {TokenUtils} from "../../../../TokenUtils";
import {BalancerConstants} from "../../../../../scripts/deploy/strategies/balancer/BalancerConstants";

export async function deploySphereWmatic1(signer: SignerWithAddress): Promise<{vault: string, strategy: string, undSymbol: string}> {
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const UNDERLYING = MaticAddresses.BALANCER_SPHERE_MATIC;
  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING);

  const vault = BalancerConstants.BALANCER_VAULT_SPHERE_WMATIC;
  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerSphereWmatic");

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerSphereWmatic__factory.connect(strategyProxy.address, signer).initialize(core.controller, vault));

  return {vault, strategy: strategyProxy.address, undSymbol};
}
