import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {config as dotEnvConfig} from "dotenv";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {DeployInfo} from "../../DeployInfo";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {
  IStrategy,
  ISmartVault,
  ITetuLiquidator__factory,
  ITetuLiquidatorController__factory,
  ICaviarChef,
  StrategyCaviarStaking__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {ethers} from "hardhat";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
    },
    deployCoreContracts: {
      type: "boolean",
      default: false,
    },
    hardhatChainId: {
      type: "number",
      default: 137
    },
  }).argv;

const {expect} = chai;
chai.use(chaiAsPromised);


const caviarChefAddress = "0x83C5022745B2511Bd199687a42D27BEFd025A9A9"

const configureLiquidator = async (signer: SignerWithAddress, deployInfo: DeployInfo) => {
  if (deployInfo.core) {
    const liquidator = ITetuLiquidator__factory.connect(await deployInfo.core.feeRewardForwarder.liquidator(), signer)
    const liquidatorController = ITetuLiquidatorController__factory.connect(await liquidator.controller(), signer)
    const gov = await DeployerUtilsLocal.impersonate(await liquidatorController.governance())
    await liquidatorController.connect(gov).changeOperatorStatus(signer.address, true);

    await liquidator.addLargestPools([{
      pool: MaticAddresses.PEARL_CVR_PEARL_POOL,
      swapper: MaticAddresses.DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.CAVIAR_TOKEN,
      tokenOut: MaticAddresses.PEARL_TOKEN,
    }], true)

    await liquidator.addLargestPools([{
      pool: MaticAddresses.PEARL_PEARL_USDR_POOL,
      swapper: MaticAddresses.DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.PEARL_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    }], true)

    await liquidator.addLargestPools([{
      pool: MaticAddresses.PEARL_USDC_USDR_POOL,
      swapper: MaticAddresses.DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.USDC_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    }], true)

    await liquidator.addLargestPools([{
      pool: MaticAddresses.PEARL_USDC_USDR_POOL,
      swapper: MaticAddresses.DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.USDR_TOKEN,
      tokenOut: MaticAddresses.USDC_TOKEN,
    }], true)

    await liquidator.addLargestPools([{
      pool: MaticAddresses.PEARL_wUSDR_USDR_POOL,
      swapper: MaticAddresses.DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.wUSDR_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    }], true)
  }
}


export const whitelistStrategy = async (signer: SignerWithAddress, strategyAddress: string) => {
  const caviarChef = await ethers.getContractAt("ICaviarChef", caviarChefAddress) as ICaviarChef;
  const smartWalletCheckerAddress = await caviarChef.smartWalletChecker();
  const smartWalletChecker = await ethers.getContractAt("ISmartWalletWhitelist", smartWalletCheckerAddress);
  const checkerAdmin = await DeployerUtilsLocal.impersonate(await smartWalletChecker.admin())
  await smartWalletChecker.connect(checkerAdmin).approveWallet(strategyAddress);
}


describe('Caviar staking tests', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
    return;
  }
  const underlying = MaticAddresses.CAVIAR_TOKEN;
  const strategyName = 'StrategyCaviarStaking';

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);
    const signer = await DeployerUtilsLocal.impersonate();
    await configureLiquidator(signer, deployInfo);
  });

  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = strategyName;
  const vaultName = 'xCAVIAR';

  // add custom liquidation path if necessary
  const forwarderConfigurator = null;

  // only for strategies where we expect PPFS fluctuations
  const ppfsDecreaseAllowed = false;
  // only for strategies where we expect PPFS fluctuations
  const balanceTolerance = 0;
  const finalBalanceTolerance = 0;
  const deposit = 10_000;
  // at least 3
  const loops = 3;
  const buyBackRatio = 500;
  // number of blocks or timestamp value
  const loopValue = 300;
  // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
  const advanceBlocks = true;
  const specificTests: SpecificStrategyTest[] = [];
  // **********************************************

  const deployer = (signer: SignerWithAddress) => {
    const core = deployInfo.core as CoreContractsWrapper;
    return StrategyTestUtils.deploy(
      signer,
      core,
      vaultName,
      async vaultAddress => {
        const strategy = await DeployerUtilsLocal.deployStrategyProxy(
          signer,
          strategyContractName,
        );
        const strat = StrategyCaviarStaking__factory.connect(strategy.address, signer);
        await strat.initialize(
          core.controller.address,
          vaultAddress,
          buyBackRatio,
        );

        await whitelistStrategy(signer, strategy.address)

        await strat.connect(await DeployerUtilsLocal.impersonate(await strat.controller())).setRewardTokens([MaticAddresses.CAVIAR_TOKEN, MaticAddresses.USDR_TOKEN]);

        await core.controller.setRewardDistribution([strategy.address], true);
        return strategy;
      },
      underlying,
      0,
      false
    );
  };
  const hwInitiator = (
    _signer: SignerWithAddress,
    _user: SignerWithAddress,
    _core: CoreContractsWrapper,
    _tools: ToolsContractsWrapper,
    _underlying: string,
    _vault: ISmartVault,
    _strategy: IStrategy,
    _balanceTolerance: number
  ) => {
    const hw = new DoHardWorkLoopBase(
      _signer,
      _user,
      _core,
      _tools,
      _underlying,
      _vault,
      _strategy,
      _balanceTolerance,
      finalBalanceTolerance,
    );
    hw.vaultRt = MaticAddresses.ZERO_ADDRESS
    return hw;
  };

  await universalStrategyTest(
    strategyName + vaultName,
    deployInfo,
    deployer,
    hwInitiator,
    forwarderConfigurator,
    ppfsDecreaseAllowed,
    balanceTolerance,
    deposit,
    loops,
    loopValue,
    advanceBlocks,
    specificTests,
  );
});
