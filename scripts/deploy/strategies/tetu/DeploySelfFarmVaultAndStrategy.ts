import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {ISmartVault__factory, StrategyTetuSelfFarm__factory,} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {TetuConstants} from "./TetuConstants";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

export async function deploySelfFarmVaultAndStrategy(farmableVault: string, underlying: string) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(underlying)

  if (await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, underlying)) {
    console.error("VAULT WITH THIS UNDERLYING EXIST! skip");
    return;
  }

  const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
    "Tetu Vault " + undSymbol,
    "x" + undSymbol,
    core.controller,
    underlying,
    60 * 60 * 24 * 7,
    false,
    MaticAddresses.ZERO_ADDRESS,
    0
  ));
  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", TetuConstants.STRATEGY_SELF_FARM_LOGIC);
  await RunHelper.runAndWait(() => StrategyTetuSelfFarm__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vaultProxy.address,
    farmableVault
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}
