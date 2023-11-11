import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {
  BalancerPoolStrategyBaseBALETH__factory,
  ISmartVault,
  IStrategy, StrategyBalancerBALETH__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {Misc} from "../../../../scripts/utils/tools/Misc";
import {BalancerBPTSpecificHardWork} from "./BalancerBPTSpecificHardWork";
import {parseUnits} from "ethers/lib/utils";
import {UtilsBalancerGaugeV2} from "../../../baseUtils/balancer/utilsBalancerGaugeV2";


const {expect} = chai;
chai.use(chaiAsPromised);

describe('BalancerLP_tetuBAL_BPT_Test', async () => {
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = 'StrategyBalancerBALETH';
  const vaultName = "tetuBAL_BPT";
  const underlying = MaticAddresses.BALANCER_POOL_tetuBAL_BPT;
  const poolId = MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID;
  const gauge = MaticAddresses.BALANCER_GAUGE_tetuBAL_BPT;
  const depositToken = MaticAddresses.tetuBAL;
  const buybackRatio = 20_00;
  const rewardTokens = [MaticAddresses.BAL_TOKEN];

  // const underlying = token;
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
  const loopValue = 300;
  const advanceBlocks = false;
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
        const strat = await StrategyBalancerBALETH__factory.connect(strategy.address, signer);
        await strat.initialize(
          core.controller.address,
          vaultAddress,
          underlying,
          poolId,
          gauge,
          depositToken,
          buybackRatio,
          rewardTokens,
        );

        // Set up BalancerGauge. Register TETU as reward token in the GAUGE and in the strategy
        await UtilsBalancerGaugeV2.registerRewardTokens(signer, await strat.gauge(), MaticAddresses.TETU_TOKEN);
        await strat.connect(await DeployerUtilsLocal.impersonate(await strat.controller())).setRewardTokens([MaticAddresses.TETU_TOKEN]);
        await UtilsBalancerGaugeV2.depositRewardTokens(signer, await strat.gauge(), await strat.rewardTokens());

        return strategy;
      },
      underlying,
      0,
      true
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
    const hw = new BalancerBPTSpecificHardWork(
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
    hw.allowLittleDustInStrategyAfterFullExit = parseUnits('100');
    return hw;
  };

  await universalStrategyTest(
    strategyContractName + vaultName,
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
