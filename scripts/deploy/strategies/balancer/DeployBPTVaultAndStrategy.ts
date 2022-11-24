import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {ISmartVault__factory, StrategyBalancerBPT__factory,} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {BalancerConstants} from "./BalancerConstants";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

export async function deployBalancerVaultAndStrategy(pool: string, poolId: string, gauge: string, depositToken: string, bbRatio: number) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(pool)

  if (await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, pool)) {
    console.error("VAULT WITH THIS UNDERLYING EXIST! skip");
    return;
  }

  const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
    "Tetu Vault " + undSymbol,
    "x" + undSymbol,
    core.controller,
    pool,
    60 * 60 * 24 * 7,
    false,
    MaticAddresses.xTETU,
    0
  ));
  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", BalancerConstants.STRATEGY_BALANCER_BPT_LOGIC);
  await RunHelper.runAndWait(() => StrategyBalancerBPT__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vaultProxy.address,
    depositToken,
    poolId,
    gauge,
    bbRatio
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}
