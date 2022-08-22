import {ethers, network} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  ISmartVault__factory, IStrategySplitter__factory,
  StrategyMeshSinglePool,
  StrategyMeshSinglePool__factory,
  IController__factory
} from "../../../../typechain";
import {appendFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {RunHelper} from "../../../utils/tools/RunHelper";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const strategyContractName = 'StrategyMeshSinglePool';
  const strategyImpl = '0x6323093612a93097956Cc00479E8D5cD25918787'; // 1.0.0
  const meshSinglePoolAddress = '0x00C3e7978Ede802d7ce6c6EfFfB4F05A4a806FD3';
  const underlyingName = 'MaticX';
  const underlying = MaticAddresses.MaticX_TOKEN;
  const proxyRewardAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

  console.log('/// DEPLOY ' + underlyingName);

  // VAULT
  console.log('\ndeploy vaultProxy...', DeployerUtilsLocal.getVaultLogic(signer).address);
  const vault = await DeployerUtilsLocal.deployContract(
    signer,
    "TetuProxyControlled",
    DeployerUtilsLocal.getVaultLogic(signer).address
  );

  console.log('\ninitializeSmartVault...');
  await RunHelper.runAndWait(() => ISmartVault__factory.connect(vault.address, signer)
    .initializeSmartVault(
      "Tetu Vault " + underlyingName,
      "x" + underlyingName,
      core.controller,
      underlying,
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
      underlying,
      vault.address
    )
  );

  // STRATEGY
  console.log('\nstrategy deployContract...', strategyImpl);
  const strategy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategyImpl);
  // const [strategy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, "StrategyMeshSinglePool");
  await DeployerUtilsLocal.wait(5);

  console.log('\ninitialize strategy...');
  await RunHelper.runAndWait(() => StrategyMeshSinglePool__factory.connect(strategy.address, signer)
    .initialize(
      core.controller,
      splitter.address,
      underlying,
      proxyRewardAddress,
      meshSinglePoolAddress
    )
  );

  if (network.name==='hardhat') {
    console.log('\nHardhat detected. Simulate Controller actions...');
    const gov = await DeployerUtilsLocal.impersonate(MaticAddresses.GOV_ADDRESS);
    const controller = IController__factory.connect(core.controller, gov)

    console.log('\naddStrategy...');
    await RunHelper.runAndWait(() =>
      controller.connect(gov).addStrategiesToSplitter(splitter.address, [strategy.address])
    );

    console.log('\nsetStrategyRatios...');
    await RunHelper.runAndWait(() =>
      splitter.connect(gov).setStrategyRatios([strategy.address], [100])
    );

    console.log('\naddVaultsAndStrategies...');
    await RunHelper.runAndWait(() =>
      controller.connect(gov).addVaultsAndStrategies([vault.address], [strategy.address])
    );
  }

  const txt = `${underlyingName} vault: ${vault.address} spliter: ${splitter.address} strategy: ${strategy.address}\n`;
  appendFileSync(`./tmp/deployed/${strategyContractName}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  // await DeployerUtilsLocal.verifyWithArgs(strategy.address, [logic.address]);
  await DeployerUtilsLocal.verifyProxy(strategy.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
