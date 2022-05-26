import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";


async function main() {
  const signer = (await ethers.getSigners())[0];

  const contract = await DeployerUtilsLocal.deployContract(signer, 'StrategyMeshStaking');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verify(contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
