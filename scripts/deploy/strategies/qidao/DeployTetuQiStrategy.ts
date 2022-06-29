import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {IERC20Extended__factory} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

const strategyContractName = 'StrategyQiStaking';

async function main() {
  const signer = (await ethers.getSigners())[0];

  const data = await DeployerUtilsLocal.deployContract(signer, strategyContractName);

  const txt = `strategy: ${data.address}`;
  writeFileSync(`./tmp/deployed/${strategyContractName}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verify(data.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
