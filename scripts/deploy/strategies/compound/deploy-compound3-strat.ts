import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {Compound3Strategy__factory} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";

const strategyContractName = 'Compound3Strategy';

export async function deployCompound3Strat(underlying: string, splitter: string, comet: string) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const undSymbol = await TokenUtils.tokenSymbol(underlying)


  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await RunHelper.runAndWait(() => Compound3Strategy__factory.connect(proxy.address, signer).initialize(core.controller, underlying, splitter, comet, 20_00,));

  const txt = `
  splitter: ${splitter}
  strategy: ${proxy.address}
  `;
  writeFileSync(`./tmp/deployed/${undSymbol}_${strategyContractName}.txt`, txt, 'utf8');
}
