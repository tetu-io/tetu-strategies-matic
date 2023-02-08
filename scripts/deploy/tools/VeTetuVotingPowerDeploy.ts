import {ethers} from "hardhat";
import {TetuBalVotingPower__factory, VeTETUVotingPower__factory} from "../../../typechain";
import {DeployerUtilsLocal} from "../DeployerUtilsLocal";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const logic = await DeployerUtilsLocal.deployContract(signer, 'VeTETUVotingPower');
  const proxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", logic.address);

  await VeTETUVotingPower__factory.connect(proxy.address, signer).initialize(
    core.controller
  );

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
