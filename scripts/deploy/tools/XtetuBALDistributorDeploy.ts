import {ethers} from "hardhat";
import {XtetuBALDistributor__factory} from "../../../typechain";
import {DeployerUtilsLocal} from "../DeployerUtilsLocal";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const logic = await DeployerUtilsLocal.deployContract(signer, 'XtetuBALDistributor');
  const proxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", logic.address);

  await XtetuBALDistributor__factory.connect(proxy.address, signer).initialize(
    core.controller
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
