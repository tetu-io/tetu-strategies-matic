import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import hre, {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import {TokenUtils} from "../../../../../test/TokenUtils";
import {RunHelper} from "../../../../utils/tools/RunHelper";
import {
  ISmartVault__factory, StrategyBalancerSphereWmatic__factory,
  StrategyBalancerStMaticWmatic__factory
} from "../../../../../typechain";
import {BalancerConstants} from "../BalancerConstants";
import {writeFileSync} from "fs";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/1.SPHERE-WMATIC.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/1.SPHERE-WMATIC.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const UNDERLYING = MaticAddresses.BALANCER_SPHERE_MATIC;
  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING);

  const vault = BalancerConstants.BALANCER_VAULT_SPHERE_WMATIC;
  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerSphereWmatic");

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerSphereWmatic__factory.connect(strategyProxy.address, signer).initialize(core.controller, vault));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
