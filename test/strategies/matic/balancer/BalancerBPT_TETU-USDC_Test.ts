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
  StrategyBalancerStMaticWmatic__factory, StrategyBalancerTetuUsdc__factory
} from "../../../../typechain";
import {BalancerBPTstMaticSpecificHardWork} from "./BalancerBPTstMaticSpecificHardWork";
import {BalancerBPTUsdcTetuSpecificHardWork} from "./BalancerBPTUsdcTetuSpecificHardWork";


const {expect} = chai;
chai.use(chaiAsPromised);

describe('BalancerBPT_TETU-USDC_Test', async () => {
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = 'StrategyBalancerTetuUsdc';
  const vaultName = "bptTetuUsdc";
  const underlying = MaticAddresses.BALANCER_TETU_USDC;

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
        const tetuBalHolder = (await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'TetuBalHolder'))[0];
        await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).initialize(
          core.controller.address,
          vaultAddress,
          tetuBalHolder.address,
          core.controller.address
        );

        await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).setPolRatio(50)

        await core.controller.changeWhiteListStatus([tetuBalHolder.address], true);

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
    return new BalancerBPTUsdcTetuSpecificHardWork(
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