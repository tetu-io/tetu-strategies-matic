import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  Aave3Strategy__factory,
  ISmartVault__factory,
  StrategyTetuMeshLp__factory
} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";

const strategyContractName = 'Aave3Strategy';
const underlying = MaticAddresses.BAL_TOKEN;

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const undSymbol = await TokenUtils.tokenSymbol(underlying)

  if (await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, underlying)) {
    console.error("VAULT WITH THIS UNDERLYING EXIST! skip");
    return;
  }

  const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
    "Tetu Vault " + undSymbol,
    "x" + undSymbol,
    core.controller,
    underlying,
    60 * 60 * 24 * 7,
    false,
    MaticAddresses.ZERO_ADDRESS,
    0
  ));

  const splitter = await DeployerUtilsLocal.deployStrategySplitter(signer);
  await splitter.initialize(
    core.controller,
    underlying,
    vaultProxy.address,
  );

  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await RunHelper.runAndWait(() => Aave3Strategy__factory.connect(proxy.address, signer).initialize(core.controller, underlying, splitter.address));

  const txt = `
  vault: ${vaultProxy.address}
  splitter: ${splitter.address}
  strategy: ${proxy.address}
  `;
  writeFileSync(`./tmp/deployed/${undSymbol}_${strategyContractName}.txt`, txt, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
