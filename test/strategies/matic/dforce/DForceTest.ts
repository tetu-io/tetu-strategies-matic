import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {readFileSync} from "fs";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {
  Aave2Strategy__factory, DForceStrategy__factory,
  IFeeRewardForwarder,
  ISmartVault, ISmartVault__factory,
  IStrategy, IVaultController__factory
} from "../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {DeployInfo} from "../../DeployInfo";
import {FoldingDoHardWork} from "../../FoldingDoHardWork";
import {FoldingProfitabilityTest} from "../../FoldingProfitabilityTest";
import {TokenUtils} from "../../../TokenUtils";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {parseUnits} from "ethers/lib/utils";
import {UniswapUtils} from "../../../UniswapUtils";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {DForceChangePriceUtils} from "./DForceChangePriceUtils";
import {HardWorkForDForce} from "./HardWorkForDForce";

const {expect} = chai;
chai.use(chaiAsPromised);

describe('DForce tests', async () => {
  const infos = readFileSync('scripts/utils/download/data/dforce_markets.csv', 'utf8').split(/\r?\n/);
  const deployInfo: DeployInfo = new DeployInfo();

  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, false);
  });

  infos.forEach(info => {
    const strat = info.split(',');

    const idx = strat[0];
    const rTokenName = strat[1];
    const rTokenAddress = strat[2];
    const token = strat[3];
    const tokenName = strat[4];
    const collateralFactor = strat[5];
    const borrowTarget = strat[6];

    if (!idx || idx === 'idx' || +idx === -1) {
      console.log('skip', idx);
      return;
    }

    // if (idx !== '0') {
    //   return;
    // }

    console.log('Start test strategy', idx, rTokenName);
    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    const strategyContractName = 'DForceStrategy';
    const underlying = token;
    const forwarderConfigurator = null;
    // only for strategies where we expect PPFS fluctuations
    const ppfsDecreaseAllowed = true;
    // only for strategies where we expect PPFS fluctuations
    const balanceTolerance = 0;
    const finalBalanceTolerance = 0;
    const deposit = 1000_000;
    // at least 3
    const loops = 3;
    // number of blocks or timestamp value
    const loopValue = 3000;
    // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
    const advanceBlocks = true;
    const specificTests = null;
    // **********************************************

    const deployer = (signer: SignerWithAddress) => {
      const core = deployInfo.core as CoreContractsWrapper;
      return StrategyTestUtils.deploy(
        signer,
        core,
        tokenName,
        async vaultAddress => {
          const strategy = await DeployerUtilsLocal.deployStrategyProxy(
            signer,
            strategyContractName,
          );
          await DForceStrategy__factory.connect(strategy.address, signer).initialize(
            core.controller.address,
            underlying,
            vaultAddress,
            0,
            [MaticAddresses.DF_TOKEN],
            rTokenAddress
          );

          return strategy;
        },
        underlying
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
      const hw = new HardWorkForDForce(
        _signer,
        _user,
        _core,
        _tools,
        _underlying,
        _vault,
        _strategy,
        _balanceTolerance,
        finalBalanceTolerance
      );
      hw.rTokenAddress = rTokenAddress;
      return hw;
    };

    universalStrategyTest(
      'DForceTest_' + rTokenName,
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
      specificTests
    );
  });
});
