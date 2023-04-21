import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {ISmartVault__factory,} from "../../../../typechain";
import {writeFileSync} from "fs";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

export async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const underlying = MaticAddresses.tetuBAL;
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
    60 * 60 * 24 * 28,
    false,
    MaticAddresses.USDC_TOKEN,
    0
  ));
  const strategy = await DeployerUtilsLocal.deployContract(signer, "NoopStrategy", ...[
    core.controller,
    underlying,
    vaultProxy.address,
    [],
    [underlying],
    36 // balancer
  ]);

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategy.address}`;
    writeFileSync(`tmp/deployed/x${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
