import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import hre, {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import {TokenUtils} from "../../../../../test/TokenUtils";
import {RunHelper} from "../../../../utils/tools/RunHelper";
import {
  ISmartVault__factory,
  StrategyBalancerStMaticWmatic__factory
} from "../../../../../typechain";
import {BalancerConstants} from "../BalancerConstants";
import {writeFileSync} from "fs";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const UNDERLYING = MaticAddresses.BALANCER_stMATIC_MATIC

  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING)

  if (await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING)) {
    console.error("VAULT WITH THIS UNDERLYING EXIST! skip");
    return;
  }

  const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
    "Tetu Vault " + undSymbol,
    "x" + undSymbol,
    core.controller,
    UNDERLYING,
    60 * 60 * 24 * 7,
    false,
    MaticAddresses.ZERO_ADDRESS,
    0
  ));

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerStMaticWmatic");

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerStMaticWmatic__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vaultProxy.address
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vaultProxy.address}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
