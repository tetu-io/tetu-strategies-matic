import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {StrategyTetuMeshLp__factory} from "../../../../typechain";
import {writeFileSync} from "fs";

const strategyContractName = 'StrategyBalancerPool';
const VAULT = '';

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await StrategyTetuMeshLp__factory.connect(proxy.address, signer).initialize(core.controller, VAULT)

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
