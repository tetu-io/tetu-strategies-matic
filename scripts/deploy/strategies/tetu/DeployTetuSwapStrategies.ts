import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  ISmartVault__factory,
  StrategyTetuSelfFarm__factory,
  StrategyTetuSwap__factory,
} from "../../../../typechain";
import {appendFileSync, writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {TetuConstants} from "./TetuConstants";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

const tetuSwapStrategyImpl = '0xC718429C845e54DA46556cA641291229D98A021f'

export async function deployTetuSwapStrategies(vault: string, underlying: string) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const undSymbol = await TokenUtils.tokenSymbol(underlying)

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", tetuSwapStrategyImpl);
  await RunHelper.runAndWait(() => StrategyTetuSwap__factory.connect(strategyProxy.address, signer).init(
    core.controller,
    vault,
    underlying
  ));
  const txt = `${undSymbol} vault: ${vault} strategy: ${strategyProxy.address}\n`;
  console.log(txt);
  if (hre.network.name !== 'hardhat') {
    appendFileSync(`tmp/deployed/tetuswap.txt`, txt, 'utf8');
  }
}
