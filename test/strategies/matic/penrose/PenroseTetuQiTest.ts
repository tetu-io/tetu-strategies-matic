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
  ISmartVault__factory,
  StrategyQiStaking,
  IFeeRewardForwarder, IPriceCalculator__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";


const {expect} = chai;
chai.use(chaiAsPromised);

describe('penrose tetuQi tests', async () => {
  const strategyName = 'StrategyPenroseTetuQi';
  const underlying = MaticAddresses.DYSTOPIA_tetuQI_QI;

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, false);
  });

  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = strategyName;
  const vaultName = 'penQi/tetuQi';

  const forwarderConfigurator = async (f: IFeeRewardForwarder) => {
    await f.addLargestLps(
      [MaticAddresses.PEN_TOKEN, MaticAddresses.DYST_TOKEN, MaticAddresses.tetuQI_TOKEN],
      ['0x2c5ba816da67ce34029fc4a9cc7545d207abf945', '0x1e08a5b6a1694bc1a65395db6f4c506498daa349', MaticAddresses.DYSTOPIA_tetuQI_QI]
    )
  };
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

  const deployer = async (signer: SignerWithAddress) => {
    const core = deployInfo.core as CoreContractsWrapper;
    const data = await StrategyTestUtils.deploy(
      signer,
      core,
      vaultName,
      async vaultAddress => {
        const strategy = await DeployerUtilsLocal.deployStrategyProxy(
          signer,
          strategyContractName,
        ) as StrategyQiStaking;
        await strategy.initialize(core.controller.address, vaultAddress);
        return strategy;
      },
      underlying
    );
    console.log('set redirect')
    await ISmartVault__factory.connect(MaticAddresses.tetuQI_TOKEN, signer).setRewardsRedirect(MaticAddresses.DYSTOPIA_tetuQI_QI, data[1].address);
    console.log('add reward')
    await core.vaultController.addRewardTokens([data[0].address], MaticAddresses.tetuQI_TOKEN);
    console.log('set distributor')
    await core.controller.setRewardDistribution([data[1].address], true);

    return data;
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
    return new DoHardWorkLoopBase(
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
