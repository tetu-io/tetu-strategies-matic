import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  Aave2Strategy__factory,
  Aave3Strategy__factory, DForceStrategy__factory, IBookkeeper__factory,
  ISmartVault__factory, IStrategy__factory, IStrategySplitter__factory, MeshLendStrategy__factory,
  StrategyTetuMeshLp__factory
} from "../../../../typechain";
import {readFileSync, writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {TokenUtils} from "../../../../test/TokenUtils";

const strategyContractName = 'MeshLendStrategy';

export async function deployMeshLendStrat(underlying: string) {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

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

  const infos = readFileSync('scripts/utils/download/data/mesh_pools.csv', 'utf8').split(/\r?\n/);

  let meshSinglePoolAddress = '';
  for (const info of infos) {
    const strat = info.split(',');

    const idx = strat[0];
    const meshVaultName = strat[1];
    const underlyingName = strat[3];
    const underlyingAddress = strat[4];
    const proxyRewardAddress = strat[5];

    if (!idx || idx === 'idx' || underlyingAddress.toLowerCase() !== underlying) {
      continue;
    }
    meshSinglePoolAddress = strat[2];
    break;
  }

  if (meshSinglePoolAddress === '') {
    throw new Error('no meshSinglePoolAddress for ' + undSymbol);
  }

  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await RunHelper.runAndWait(() => MeshLendStrategy__factory.connect(proxy.address, signer).initialize(core.controller, underlying, splitter, 100_00, [MaticAddresses.USDC_TOKEN], meshSinglePoolAddress));

  const txt = `
  vault: ${vaultAdr}
  splitter: ${splitter}
  strategy: ${proxy.address}
  `;
  writeFileSync(`./tmp/deployed/${undSymbol}_${strategyContractName}.txt`, txt, 'utf8');
}
