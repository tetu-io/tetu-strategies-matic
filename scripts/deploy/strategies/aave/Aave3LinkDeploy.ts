import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {Aave3Strategy__factory, StrategyTetuMeshLp__factory} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";

const strategyContractName = 'Aave3Strategy';
const SPLITTER = '0xA68254B2B84E2e74cA14ED461B1e4F6612F366f1';
const underlying = MaticAddresses.LINK_TOKEN;

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await RunHelper.runAndWait(() => Aave3Strategy__factory.connect(proxy.address, signer).initialize(core.controller, underlying, SPLITTER));

  const txt = `strategy: ${proxy.address}`;
  writeFileSync(`./tmp/deployed/${strategyContractName}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verify(logic.address);
  await DeployerUtilsLocal.verifyWithArgs(proxy.address, [logic.address]);
  await DeployerUtilsLocal.verifyProxy(proxy.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
