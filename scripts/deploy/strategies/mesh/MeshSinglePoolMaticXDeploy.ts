import {deployMeshMaticXStrategy} from "./MeshSinglePoolMaticXDeployLib";
import {ethers} from "hardhat";

async function main() {
  const signer = (await ethers.getSigners())[0];
  await deployMeshMaticXStrategy(signer);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
