import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  IBookkeeper__factory,
  ISmartVault__factory,
  IStrategySplitter__factory,
  ZerovixstMaticStrategy__factory
} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";

const strategyContractName = 'ZerovixstMaticStrategy';

export async function deployZerovixstMaticStrategy() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const underlying = MaticAddresses.stMATIC_TOKEN;

  const undSymbol = await TokenUtils.tokenSymbol(underlying)

  const vaults = await IBookkeeper__factory.connect(core.bookkeeper, signer).vaults();
  let vaultAdr = '';
  for (const vault of vaults) {
    const strat = await ISmartVault__factory.connect(vault, signer).strategy();
    const platform = (await IStrategySplitter__factory.connect(strat, signer).platform())
    if (platform === 24) {
      const vaultUnd = await ISmartVault__factory.connect(vault, signer).underlying();
      if (vaultUnd.toLowerCase() === underlying.toLowerCase()) {
        vaultAdr = vault;
        break;
      }
    }
  }
  if (vaultAdr === '') throw new Error('no vault');

  const splitter = await ISmartVault__factory.connect(vaultAdr, signer).strategy();


  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await RunHelper.runAndWait(() => ZerovixstMaticStrategy__factory.connect(proxy.address, signer).initialize(
    core.controller,
    splitter,
    20_00,
  ));

  const txt = `
  vault: ${vaultAdr}
  splitter: ${splitter}
  strategy: ${proxy.address}
  `;
  writeFileSync(`./tmp/deployed/${undSymbol}_${strategyContractName}.txt`, txt, 'utf8');
}
