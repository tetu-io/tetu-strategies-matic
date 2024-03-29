import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {
  ISmartVault,
  IStrategy, StrategyBalancerSphereWmatic__factory,
} from "../../../../typechain";
import {BalancerBPTSpecificHardWork} from "./BalancerBPTSpecificHardWork";
import {UtilsBalancerGaugeV2} from "../../../baseUtils/balancer/utilsBalancerGaugeV2";


const {expect} = chai;
chai.use(chaiAsPromised);

describe.skip('BalancerBPT_SPHERE-MATIC_Test', async () => {
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = 'StrategyBalancerSphereWmatic';
  const vaultName = "StrategyBalancerSphereWmatic";
  const underlying = MaticAddresses.BALANCER_SPHERE_MATIC;
  const VAULT_BBAMUSD = '0xf2fB1979C4bed7E71E6ac829801E0A8a4eFa8513'.toLowerCase();

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
        const strat = StrategyBalancerSphereWmatic__factory.connect(strategy.address, signer);
        await strat.initialize(core.controller.address, vaultAddress);
        console.log('/// STRATEGY DEPLOYED');

        await core.controller.setRewardDistribution([strategy.address], true);
        console.log('end setRewardDistribution')
        await core.vaultController.addRewardTokens([vaultAddress], VAULT_BBAMUSD);
        console.log('end addRewardTokens VAULT_BBAMUSD')
        // await core.vaultController.addRewardTokens([vaultAddress], MaticAddresses.TETU_TOKEN);
        // console.log('end addRewardTokens TETU_TOKEN')

        // Set up BalancerGauge. Register TETU as reward token in the GAUGE and in the strategy
        await UtilsBalancerGaugeV2.registerRewardTokens(signer, await strat.GAUGE(), MaticAddresses.TETU_TOKEN);
        await strat.connect(await DeployerUtilsLocal.impersonate(await strat.controller())).updateRewardTokensFromGauge();
        await UtilsBalancerGaugeV2.depositRewardTokens(signer, await strat.GAUGE(), await strat.rewardTokens());

        console.log('/// ENV SETUP');
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
    // hw.vaultRt = VAULT_BBAMUSD;
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
