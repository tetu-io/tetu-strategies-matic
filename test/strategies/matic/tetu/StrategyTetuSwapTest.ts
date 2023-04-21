import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {config as dotEnvConfig} from "dotenv";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {DeployInfo} from "../../DeployInfo";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {
  IStrategy,
  ISmartVault,
  StrategyTetuSelfFarm,
  StrategyTetuSwap,
  ITetuSwapPair__factory,
  IERC20__factory,
  ISmartVault__factory,
  ITetuSwapFactory__factory, IERC20Extended__factory
} from "../../../../typechain";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {SelfFarmDoHardWork} from "./SelfFarmDoHardWork";
import {VaultUtils} from "../../../VaultUtils";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {TokenUtils} from "../../../TokenUtils";
import {UniswapUtils} from "../../../UniswapUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {TetuSwapDoHardWork} from "./TetuSwapDoHardWork";
import {TimeUtils} from "../../../TimeUtils";

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

describe.skip('StrategyTetuSwapTest', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
    return;
  }

  const deployInfo: DeployInfo = new DeployInfo();
  const underlying = MaticAddresses.TETU_SWAP_USDC_BTC;
  const tokenA = MaticAddresses.WBTC_TOKEN;
  const amountA = '30'
  const tokenB = MaticAddresses.USDC_TOKEN;
  const amountB = '300000'
  const strategyName = 'StrategyTetuSwap';
  const tokenName = 'TETU_SWAP_USDC_BTC';

  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);

    const _signer = await DeployerUtilsLocal.impersonate();

    const decimalsA = await IERC20Extended__factory.connect(tokenA, _signer).decimals();
    const decimalsB = await IERC20Extended__factory.connect(tokenB, _signer).decimals();

    await TokenUtils.getToken(tokenA, _signer.address, parseUnits(amountA, decimalsA));
    await TokenUtils.getToken(tokenB, _signer.address, parseUnits(amountB, decimalsB));

    await UniswapUtils.addLiquidity(_signer, tokenA, tokenB, parseUnits(amountA, decimalsA).toString(), parseUnits(amountB, decimalsB).toString(), MaticAddresses.TETU_SWAP_FACTORY, MaticAddresses.TETU_SWAP_ROUTER);

    const balance = await IERC20__factory.connect(underlying, _signer).balanceOf(_signer.address);
    if (balance.isZero()) {
      throw new Error("zero lp");
    } else {
      console.log("LP balance", formatUnits(balance))
    }
    await IERC20__factory.connect(underlying, _signer).transfer(MaticAddresses.GOV_ADDRESS, balance);

    /// todo remove

    await deployInfo.core?.announcer.announceTetuProxyUpgrade(deployInfo.core?.feeRewardForwarder.address, '0xd19aC973D2D271AA511a56cDD2D6444805EcBe01');
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 2);
    await deployInfo.core?.controller.upgradeTetuProxyBatch([deployInfo.core?.feeRewardForwarder.address], ['0xd19aC973D2D271AA511a56cDD2D6444805EcBe01'])
  });

  const deployer = (signer: SignerWithAddress) => {
    const core = deployInfo.core as CoreContractsWrapper;
    return StrategyTestUtils.deploy(
      signer,
      core,
      tokenName,
      async vaultAddress => {
        const strat = await DeployerUtilsLocal.deployStrategyProxy(
          signer,
          strategyName,
        ) as StrategyTetuSwap;
        await strat.init(
          core.controller.address,
          vaultAddress,
          underlying,
        );

        await core.controller.setRewardDistribution([strat.address], true);
        await ITetuSwapFactory__factory.connect(MaticAddresses.TETU_SWAP_FACTORY, signer).setPairRewardRecipients([underlying], [strat.address]);

        return strat;
      },
      underlying
    );
  };

// **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const vaultName = tokenName;
  // const underlying = token;
  // add custom liquidation path if necessary
  const forwarderConfigurator = null;
  // only for strategies where we expect PPFS fluctuations
  const ppfsDecreaseAllowed = false;
  // only for strategies where we expect PPFS fluctuations
  const balanceTolerance = 0;
  const finalBalanceTolerance = 0;
  const deposit = 100_000;
  // at least 3
  const loops = 3;
  // number of blocks or timestamp value
  const loopValue = 300;
  // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
  const advanceBlocks = true;
  const specificTests: SpecificStrategyTest[] = [];
  // **********************************************
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
    return new TetuSwapDoHardWork(
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
  };

  await universalStrategyTest(
    strategyName + vaultName,
    deployInfo,
    deployer as (signer: SignerWithAddress) => Promise<[ISmartVault, IStrategy, string]>,
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
