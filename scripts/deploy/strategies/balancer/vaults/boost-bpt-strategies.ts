import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {
  deployBalancerBoostBPTStrategyOnly,
} from "../DeployVaultAndBalancerBoostStrategy";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import hre, {ethers} from "hardhat";
import {mkdir, writeFileSync} from "fs";
import {RunHelper} from "../../../../utils/tools/RunHelper";
import {ISmartVault__factory} from "../../../../../typechain";
import {TokenUtils} from "../../../../../test/TokenUtils";

async function main() {
  mkdir('./tmp/deployed', {recursive: true}, (err) => {
    if (err) throw err;
  });

  const targets = [
    [MaticAddresses.BALANCER_POOL_tetuBAL_V2_BPT, MaticAddresses.BALANCER_POOL_tetuBAL_V2_BPT_ID, MaticAddresses.BALANCER_GAUGE_tetuBAL_V2_BPT, MaticAddresses.BAL_TOKEN, MaticAddresses.BALANCER_POOL_BAL_ETH_ID,],
  ]
  const signer = (await ethers.getSigners())[0];
  let txt = ''
  for (const t of targets) {
    const underlying = t[0];
    const poolId = t[1];
    const gauge = t[2];
    const depositToken = t[3];
    const depositBPTPoolId = t[4];
    const buyBackRatio = 10_00;
    let vault = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, underlying);

    if (!vault) {
      const undSymbolA = await TokenUtils.tokenSymbol(underlying)
      const core = await DeployerUtilsLocal.getCoreAddresses();
      const vaultProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", DeployerUtilsLocal.getVaultLogic(signer).address);
      await RunHelper.runAndWait(() => ISmartVault__factory.connect(vaultProxy.address, signer).initializeSmartVault(
        "Tetu Vault " + undSymbolA,
        "x" + undSymbolA,
        core.controller,
        underlying,
        60 * 60 * 24 * 7,
        false,
        MaticAddresses.ZERO_ADDRESS,
        0
      ));

      vault = vaultProxy.address;
    }

    const {strategy, undSymbol} = await deployBalancerBoostBPTStrategyOnly(
      underlying,
      poolId,
      gauge,
      depositToken,
      depositBPTPoolId,
      buyBackRatio,
      vault,
      false
    );
    txt += `vault: ${vault} ${undSymbol}\nstrategy: ${strategy}\n`;
  }

  if (hre.network.name !== 'hardhat') {
    writeFileSync(`tmp/deployed/balancerboostbpt_strategies.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
