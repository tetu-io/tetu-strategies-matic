import {network} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  ISmartVault__factory, IStrategySplitter__factory,
  StrategyMeshSinglePool__factory,
  IController__factory
} from "../../../../typechain";
import {appendFileSync, mkdirSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreAddresses} from "../../../models/CoreAddresses";
import {TokenUtils} from "../../../../test/TokenUtils";
import {parseUnits} from "ethers/lib/utils";

export const strategyContractName = 'StrategyMeshSinglePool';
export const strategyImpl = '0x6323093612a93097956Cc00479E8D5cD25918787'; // 1.0.0
export const meshSinglePoolAddress = '0x00C3e7978Ede802d7ce6c6EfFfB4F05A4a806FD3';
export const underlyingName = 'MaticX';
export const underlying = MaticAddresses.MaticX_TOKEN;
export const proxyRewardAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

export async function deployMeshMaticXStrategy(signer: SignerWithAddress) {
  const core = await DeployerUtilsLocal.getCoreAddresses();

  return deployMeshSinglePoolStrategy(
    signer,
    core,
    strategyContractName,
    strategyImpl,
    meshSinglePoolAddress,
    underlyingName,
    underlying,
    proxyRewardAddress
  );

}
export async function deployMeshSinglePoolStrategy(
  signer: SignerWithAddress,
  core: CoreAddresses,
  _strategyContractName: string,
  _strategyImpl: string,
  _meshSinglePoolAddress: string,
  _underlyingName: string,
  _underlying: string,
  _proxyRewardAddress: string
) {
  console.log('/// deployMeshSinglePoolStrategy ' + _underlyingName);

  // VAULT
  console.log('\ndeploy vaultProxy...', DeployerUtilsLocal.getVaultLogic(signer).address);
  const vaultProxy = await DeployerUtilsLocal.deployContract(
    signer,
    "TetuProxyControlled",
    DeployerUtilsLocal.getVaultLogic(signer).address
  );

  const vault = ISmartVault__factory.connect(vaultProxy.address, signer);

  console.log('\ninitializeSmartVault...');
  await RunHelper.runAndWait(() =>
    vault.initializeSmartVault(
      "Tetu Vault " + _underlyingName,
      "x" + _underlyingName,
      core.controller,
      _underlying,
      60 * 60 * 24 * 7,
      false,
      MaticAddresses.ZERO_ADDRESS,
      0
    )
  );

  // SPLITTER
  console.log('\ndeployStrategySplitter...');
  const splitter = await DeployerUtilsLocal.deployStrategySplitter(signer);

  console.log('\ninitialize splitter...');
  await RunHelper.runAndWait(() => IStrategySplitter__factory.connect(splitter.address, signer)
    .initialize(
      core.controller,
      _underlying,
      vault.address
    )
  );

  // STRATEGY
  console.log('\nstrategy deployContract...', _strategyImpl);
  const strategy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", _strategyImpl);
  // const [strategy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, "StrategyMeshSinglePool");
  await DeployerUtilsLocal.wait(5);

  console.log('\ninitialize strategy...');
  await RunHelper.runAndWait(() => StrategyMeshSinglePool__factory.connect(strategy.address, signer)
    .initialize(
      core.controller,
      splitter.address,
      _underlying,
      _proxyRewardAddress,
      _meshSinglePoolAddress
    )
  );

  // write to file
  const txt = `network:${network.name} ${_underlyingName} vault: ${vault.address} splitter: ${splitter.address} strategy: ${strategy.address}\n`;
  const dir = './tmp/deployed/';
  mkdirSync(dir, {recursive: true});
  appendFileSync(`${dir}${_strategyContractName}.txt`, txt, 'utf8');

  if (network.name==='hardhat') {
    console.log('\nHardhat detected. Simulate Controller actions...');
    const gov = await DeployerUtilsLocal.impersonate(MaticAddresses.GOV_ADDRESS);
    const controller = IController__factory.connect(core.controller, gov)

    console.log('\naddStrategy...');
    await RunHelper.runAndWait(() =>
      controller.addStrategiesToSplitter(splitter.address, [strategy.address])
    );

    console.log('\nsetStrategyRatios...');
    await RunHelper.runAndWait(() =>
      splitter.connect(gov).setStrategyRatios([strategy.address], [100])
    );

    console.log('\naddVaultsAndStrategies...');
    await RunHelper.runAndWait(() =>
      controller.addVaultsAndStrategies([vault.address], [splitter.address])
    );

    // Test deposit (and invest) / withdraw

    const amount = parseUnits('1000', 18);
    await TokenUtils.getToken(_underlying, signer.address, amount);
    console.log('\napprove...');
    await TokenUtils.approve(_underlying, signer, vault.address, amount.toString());

    console.log('\ndepositAndInvest...');
    await vault.depositAndInvest(amount);

    const shares = await TokenUtils.balanceOf(vault.address, signer.address);
    console.log('shares', shares.toString());

    console.log('\nrebalanceAll...');
    await splitter.connect(gov).rebalanceAll();

    const strategyShares = await TokenUtils.balanceOf(
      '0x00C3e7978Ede802d7ce6c6EfFfB4F05A4a806FD3',
      strategy.address
    );
    console.log('strategyShares', strategyShares.toString());

    if (strategyShares.eq(0)) {
      console.warn('!!! SOMETHING WRONG !!! - Strategy do not have shares');
    } else {
      console.log('+++ OK - Strategy have shares');
    }

    console.log('\nwithdraw...');
    await vault.withdraw(shares);
    const balance = await TokenUtils.balanceOf(_underlying, signer.address);
    console.log('balance', balance.toString());

    if (balance.gt(amount)) {
      console.log('+++ OK - Strategy have profit');
    } else {
      console.warn('!!! SOMETHING WRONG !!! - Strategy do not have profit');
    }

  } else {
    // verify on live network
    await DeployerUtilsLocal.wait(5);
    // await DeployerUtilsLocal.verifyWithArgs(strategy.address, [logic.address]);
    await DeployerUtilsLocal.verifyProxy(strategy.address);
  }

  console.log('done.');
  return {vault, splitter, strategy}

}
