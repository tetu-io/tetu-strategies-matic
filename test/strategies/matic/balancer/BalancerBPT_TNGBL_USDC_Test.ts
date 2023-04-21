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
  IStrategy,
  StrategyBalancerStMaticWmatic__factory
} from "../../../../typechain";
import {BalancerBPTSpecificHardWork} from "./BalancerBPTSpecificHardWork";


const {expect} = chai;
chai.use(chaiAsPromised);

describe('BalancerBPT_TNGBL_USDC_Test', async () => {
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = 'StrategyBalancerTngblUsdc';
  const vaultName = "StrategyBalancerTngblUsdc";
  const underlying = MaticAddresses.BALANCER_TNGBL_USDC;
  const VAULT_BB_T_USD = '0x4028cba3965e8Aea7320e9eA50914861A14dc724'.toLowerCase();

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
        await StrategyBalancerStMaticWmatic__factory.connect(strategy.address, signer).initialize(
          core.controller.address,
          vaultAddress,
        );
        console.log('/// STRATEGY DEPLOYED');

        await core.controller.setRewardDistribution([strategy.address], true);
        console.log('end setRewardDistribution')
        await core.vaultController.addRewardTokens([vaultAddress], VAULT_BB_T_USD);
        console.log('end addRewardTokens VAULT_BBAMUSD')

        console.log('/// ENV SETUP');
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
    hw.vaultRt = VAULT_BB_T_USD;
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
