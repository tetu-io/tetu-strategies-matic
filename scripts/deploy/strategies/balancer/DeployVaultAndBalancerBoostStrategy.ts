import hre, {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  ISmartVault__factory,
  StrategyBalancerBoost__factory, StrategyBalancerBoostBPT__factory,
} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

export async function deployBalancerVaultAndBoostStrategy(
  bpt: string,
  poolId: string,
  gauge: string,
  depositToken: string,
  buyBackRatio: number,
) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(bpt)

  if (await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, bpt)) {
    console.error("VAULT WITH THIS UNDERLYING EXIST! skip");
    return;
  }

  const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
    "Tetu Vault " + undSymbol,
    "x" + undSymbol,
    core.controller,
    bpt,
    60 * 60 * 24 * 7,
    false,
    MaticAddresses.TETU_TOKEN,
    0
  ));


  const strategyLogic = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBoost");
  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategyLogic.address);
  await RunHelper.runAndWait(() => StrategyBalancerBoost__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vaultProxy.address,
    poolId,
    gauge,
    buyBackRatio,
    depositToken,
    MaticAddresses.TETU_GAUGE_DEPOSITOR
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancerboost_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

export async function deployBalancerBoostStrategyOnly(
  bpt: string,
  poolId: string,
  gauge: string,
  depositToken: string,
  buyBackRatio: number,
  vault: string,
): Promise<{
  vault: string,
  strategy: string,
  undSymbol: string
}> {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(bpt)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, bpt);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBoost");

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerBoost__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault,
    poolId,
    gauge,
    buyBackRatio,
    depositToken,
    MaticAddresses.TETU_GAUGE_DEPOSITOR
  ));

  return {
    vault,
    strategy: strategyProxy.address,
    undSymbol
  }
}

export async function deployBalancerBoostBPTStrategyOnly(
  bpt: string,
  poolId: string,
  gauge: string,
  depositToken: string,
  depositBPTPoolId: string,
  buyBackRatio: number,
  vault: string,
  isVaultRegistered = true
): Promise<{
  vault: string,
  strategy: string,
  undSymbol: string
}> {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(bpt)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, bpt);
  if (isVaultRegistered && vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBoostBPT");

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerBoostBPT__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault,
    poolId,
    gauge,
    buyBackRatio,
    depositToken,
    depositBPTPoolId,
    MaticAddresses.TETU_GAUGE_DEPOSITOR
  ));

  return {
    vault,
    strategy: strategyProxy.address,
    undSymbol
  }
}
