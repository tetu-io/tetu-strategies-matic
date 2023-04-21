import {DeployerUtilsLocal} from "../DeployerUtilsLocal";
import {ethers} from "hardhat";
import {RunHelper} from "../../utils/tools/RunHelper";
import {
  Aave2Strategy__factory,
  Aave3StrategyV2__factory, DForceStrategy__factory, IController__factory,
  ISmartVault,
  ISmartVault__factory, IStrategySplitter__factory, MeshLendStrategy__factory
} from "../../../typechain";
import {appendFileSync, readFileSync, writeFileSync} from "fs";
import {MaticAddresses} from "../../addresses/MaticAddresses";
import {formatUnits} from "ethers/lib/utils";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

const SPLITTER_LOGIC = '0xbE5F369BfE3FdAD6f6256E1990138862298426eA';
const BUYBACK = 20_00;
const GAS_FACTOR = 1.2;

const vaults = new Map<string, string>([
  // ['USDC', '0xee3b4ce32a6229ae15903cda0a5da92e739685f7'],
  // ['USDT', '0xe680e0317402ad3cb37d5ed9fc642702658ef57f'],
  ['DAI', '0xb4607d4b8ecfafd063b3a3563c02801c4c7366b2'],
  ['WBTC', '0xd051605e07c2b526ed9406a555601aa4db8490d9'],
  ['WETH', '0x6781e4a6e6082186633130f08246a7af3a7b8b40'],
  ['WMATIC', '0xbd2e7f163d7605fa140d873fea3e28a031370363'],
])

async function main() {
  writeFileSync(`./tmp/deployed/new_splitters.txt`, '', 'utf8');
  // const signer = await DeployerUtilsLocal.impersonate();
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const web3 = hre.web3;

  // const aave2StratLogic = await DeployerUtilsLocal.deployContract(signer, 'Aave2Strategy');
  const aave2StratLogic = Aave2Strategy__factory.connect('0x0db9E2B59ab6b2EB686633Fc0a2fC16624CCE1Ee', signer);
  // const aave3V2StratLogic = await DeployerUtilsLocal.deployContract(signer, 'Aave3StrategyV2');
  const aave3V2StratLogic = Aave3StrategyV2__factory.connect('0xa3d7BE44Bb52F67a3e883E62039cAB888B8d32bE', signer);
  // const dforceStratLogic = await DeployerUtilsLocal.deployContract(signer, 'DForceStrategy');
  const dforceStratLogic = DForceStrategy__factory.connect('0x59c75630e88D6a91bBb7f554036ffDb9DFd926c1', signer);
  // const meshStratLogic = await DeployerUtilsLocal.deployContract(signer, 'MeshLendStrategy');
  const meshStratLogic = MeshLendStrategy__factory.connect('0x8D7f5EecB1087D5d8D77df8F60a8B024592cB4bf', signer);

  for (const vaultName of Array.from(vaults.keys())) {

    const gasPrice = await web3.eth.getGasPrice();
    console.log("Gas price: " + formatUnits(gasPrice, 9));
    const vaultAdr = vaults.get(vaultName) ?? '';
    const underlying = await ISmartVault__factory.connect(vaultAdr, signer).underlying();
    console.log('/// Deploy for ', vaultName);

    const deployedStrats: string[] = [];

    const splitter = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", SPLITTER_LOGIC);
    await RunHelper.runAndWait(() => IStrategySplitter__factory.connect(splitter.address, signer).initialize(
      core.controller,
      underlying,
      vaultAdr,
      {gasPrice: Math.floor(+gasPrice * GAS_FACTOR)}
    ));

    // ---------------------------- AAVE 2 -----------------------------------

    const aave2Strat = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", aave2StratLogic.address);
    await RunHelper.runAndWait(() => Aave2Strategy__factory.connect(aave2Strat.address, signer).initialize(core.controller, underlying, splitter.address, BUYBACK, [], {gasPrice: Math.floor(+gasPrice * GAS_FACTOR)}));
    deployedStrats.push(aave2Strat.address);

    // ---------------------------- AAVE 3 V2 -----------------------------------

    const aave3V2Strat = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", aave3V2StratLogic.address);
    await RunHelper.runAndWait(() => Aave3StrategyV2__factory.connect(aave3V2Strat.address, signer).initialize(
      core.controller,
      underlying,
      splitter.address,
      BUYBACK,
      [],
      {gasPrice: Math.floor(+gasPrice * GAS_FACTOR)}
    ));
    deployedStrats.push(aave3V2Strat.address);

    // ---------------------------- dforce -----------------------------------

    const rToken = findRToken(underlying, vaultName);
    if (rToken !== '') {
      const dforceStrat = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", dforceStratLogic.address);
      await RunHelper.runAndWait(() => DForceStrategy__factory.connect(dforceStrat.address, signer).initialize(core.controller, underlying, splitter.address, BUYBACK, [MaticAddresses.DF_TOKEN], rToken, {gasPrice: Math.floor(+gasPrice * GAS_FACTOR)}));
      deployedStrats.push(dforceStrat.address);
    }

    // ---------------------------- mesh -----------------------------------

    const meshSinglePoolAddress = findTokenForMesh(underlying, vaultName);
    if (meshSinglePoolAddress !== '') {
      const meshStrat = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", meshStratLogic.address);
      await RunHelper.runAndWait(() => MeshLendStrategy__factory.connect(meshStrat.address, signer).initialize(core.controller, underlying, splitter.address, BUYBACK, [MaticAddresses.USDC_TOKEN], meshSinglePoolAddress, {gasPrice: Math.floor(+gasPrice * GAS_FACTOR)}));
      deployedStrats.push(meshStrat.address);
    }


    /// --- add to splitter

    // await RunHelper.runAndWait(() => IController__factory.connect(core.controller, signer).addStrategiesToSplitter(
    //   splitter.address,
    //   deployedStrats
    // ));

    const avgRatio = Math.floor(100 / deployedStrats.length);
    const ratios = (new Array(deployedStrats.length)).fill(avgRatio);
    if (avgRatio * deployedStrats.length < 100) {
      ratios[0] = avgRatio + (100 - (avgRatio * deployedStrats.length));
    }
    // await RunHelper.runAndWait(() => IStrategySplitter__factory.connect(splitter.address, signer).setStrategyRatios(
    //   deployedStrats,
    //   ratios
    // ))

    const txt = `${vaultName} vault: ${vaultAdr} splitter: ${splitter.address} strats: ${deployedStrats} ratios: ${ratios}\n`;
    appendFileSync(`./tmp/deployed/new_splitters.txt`, txt, 'utf8');
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


function findRToken(underlying: string, name: string) {
  const infos = readFileSync('scripts/utils/download/data/dforce_markets.csv', 'utf8').split(/\r?\n/);
  let rTokenAddress = '';
  for (const info of infos) {
    const strat = info.split(',');

    const idx = strat[0];
    const rTokenName = strat[1];
    const token = strat[3];
    const tokenName = strat[4];
    const collateralFactor = strat[5];
    const borrowTarget = strat[6];

    if (!idx || idx === 'idx' || token.toLowerCase() !== underlying.toLowerCase()) {
      continue;
    }
    rTokenAddress = strat[2];
    break;
  }

  if (rTokenAddress === '') {
    console.log('no rToken for ' + name);
  }
  return rTokenAddress;
}

function findTokenForMesh(underlying: string, name: string) {
  const infos = readFileSync('scripts/utils/download/data/mesh_pools.csv', 'utf8').split(/\r?\n/);

  let meshSinglePoolAddress = '';
  for (const info of infos) {
    const strat = info.split(',');

    const idx = strat[0];
    const meshVaultName = strat[1];
    const underlyingName = strat[3];
    const underlyingAddress = strat[4];
    const proxyRewardAddress = strat[5];

    if (!idx || idx === 'idx' || underlyingAddress.toLowerCase() !== underlying.toLowerCase()) {
      continue;
    }
    meshSinglePoolAddress = strat[2];
    break;
  }

  if (meshSinglePoolAddress === '') {
    console.log('no meshSinglePoolAddress for ' + name);
  }
  return meshSinglePoolAddress;
}
