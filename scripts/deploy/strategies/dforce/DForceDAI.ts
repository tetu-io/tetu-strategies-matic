import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {IERC20Extended__factory} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

const strategyContractName = 'StrategyDForceFold';
const VAULT = '0x9F7d0D5C511C49d74026D4E9F9a6cBe8876E0947';
const UNDERLYING = MaticAddresses.DAI_TOKEN;
const I_TOKEN = "0xec85F77104Ffa35a5411750d70eDFf8f1496d95b";
const BORROW_FACTOR = 8000;
const COLLATERAL_FACTOR = 8499;

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const args = [
    core.controller,
    VAULT,
    UNDERLYING,
    I_TOKEN,
    BORROW_FACTOR,
    COLLATERAL_FACTOR,
  ];

  const data = await DeployerUtilsLocal.deployContract(signer, strategyContractName, ...args);

  const symb = await IERC20Extended__factory.connect(UNDERLYING, signer).symbol()

  const txt = `strategy: ${data.address}`;
  writeFileSync(`./tmp/deployed/${strategyContractName}_${symb}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verifyWithArgs(data.address, args);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
