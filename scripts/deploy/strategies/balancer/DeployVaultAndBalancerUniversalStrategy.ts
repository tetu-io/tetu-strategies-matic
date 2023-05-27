import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {ISmartVault__factory, StrategyBalancerUniversal__factory,} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

export async function deployBalancerVaultAndUniversalStrategy(
  bpt: string,
  poolId: string,
  gauge: string,
  isCompound: boolean,
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


  const strategyLogic = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerUniversal");
  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategyLogic.address);
  await RunHelper.runAndWait(() => StrategyBalancerUniversal__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vaultProxy.address,
    poolId,
    gauge,
    isCompound,
    buyBackRatio,
    depositToken,
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

export async function deployBalancerUniversalStrategyOnly(
  bpt: string,
  poolId: string,
  gauge: string,
  isCompound: boolean,
  depositToken: string,
  buyBackRatio: number,
  vault: string,
  strategyLogic: string
) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(bpt)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, bpt);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategyLogic);
  await RunHelper.runAndWait(() => StrategyBalancerUniversal__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault,
    poolId,
    gauge,
    isCompound,
    buyBackRatio,
    depositToken,
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}