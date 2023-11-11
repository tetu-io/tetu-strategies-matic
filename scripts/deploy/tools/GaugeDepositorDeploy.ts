import {ethers} from "hardhat";
import {GaugeDepositor__factory} from "../../../typechain";
import {DeployerUtilsLocal} from "../DeployerUtilsLocal";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const logic = await DeployerUtilsLocal.deployContract(signer, 'GaugeDepositor');
  const proxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", logic.address);

  await GaugeDepositor__factory.connect(proxy.address, signer).initialize(
    core.controller
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
