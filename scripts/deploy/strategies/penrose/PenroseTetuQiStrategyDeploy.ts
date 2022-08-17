import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  IERC20Extended__factory,
  ISmartVault__factory,
  StrategyPenroseTetuQi__factory
} from "../../../../typechain";
import {writeFileSync} from "fs";

const strategyContractName = 'StrategyPenroseTetuQi';
const VAULT = '0x53d034c0d2680F39C61c9e7a03Fb707a2A1b6e9B';

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const logic = await DeployerUtilsLocal.deployContract(signer, strategyContractName);
  const proxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", logic.address);

  await StrategyPenroseTetuQi__factory.connect(proxy.address, signer).initialize(
    core.controller,
    VAULT
  );

  const symb = await IERC20Extended__factory.connect(await ISmartVault__factory.connect(VAULT, signer).underlying(), signer).symbol()

  const txt = `
  vault: ${VAULT}
  strategy: ${proxy.address}
  `;
  writeFileSync(`./tmp/deployed/${strategyContractName}_${symb.replace('/', '-')}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verify(logic.address);
  await DeployerUtilsLocal.verifyWithArgs(proxy.address, [logic.address]);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
