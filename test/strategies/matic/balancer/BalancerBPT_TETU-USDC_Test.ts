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
  IBalancerGauge__factory,
  IController__factory, IERC20__factory, IERC20Metadata__factory,
  IFeeRewardForwarder__factory, IPriceCalculator,
  ISmartVault, ISmartVault__factory,
  IStrategy, StrategyBalancerTetuUsdc,
  StrategyBalancerTetuUsdc__factory
} from "../../../../typechain";
import {BalancerBPTUsdcTetuSpecificHardWork} from "./BalancerBPTUsdcTetuSpecificHardWork";
import {Misc} from "../../../../scripts/utils/tools/Misc";
import {BigNumber} from "ethers";
import {TimeUtils} from "../../../TimeUtils";
import {ethers} from "hardhat";
import {VaultUtils} from "../../../VaultUtils";
import {TokenUtils} from "../../../TokenUtils";
import {UniswapUtils} from "../../../UniswapUtils";
import {parseUnits} from "ethers/lib/utils";


const {expect} = chai;
chai.use(chaiAsPromised);

describe('BalancerBPT_TETU-USDC_Test', async () => {
  describe('Universal test', async () => {
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

          await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).initialize(
            core.controller.address,
            vaultAddress,
            core.controller.address, // tetuBalHolder.address,
            core.controller.address
          );

          await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).setPolRatio(50);

          await IFeeRewardForwarder__factory.connect(core.feeRewardForwarder.address, signer).setTokenThreshold(MaticAddresses.BAL_TOKEN, 10_000_000);

          // Set up BalancerGauge
          // register TETU as reward token in the GAUGE
          const strat = StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer);
          const gauge = await IBalancerGauge__factory.connect(await strat.GAUGE(), signer);
          const rewardToken = MaticAddresses.TETU_TOKEN;
          const rt = IERC20Metadata__factory.connect(rewardToken, signer);

          // register new rewards distributor
          const rewardsDistributor = ethers.Wallet.createRandom().address;
          await gauge.connect(
            await DeployerUtilsLocal.impersonate(await gauge.authorizer_adaptor())
          ).add_reward(rewardToken, rewardsDistributor);
          await gauge.connect(
            await DeployerUtilsLocal.impersonate(await gauge.authorizer_adaptor())
          ).set_reward_distributor(rewardToken, rewardsDistributor);

          // deposit some amount of the rewards to the gauge
          const amount = parseUnits('1000', await rt.decimals());
          await TokenUtils.getToken(rewardToken, rewardsDistributor, amount);

          await IERC20__factory.connect(rewardToken, await DeployerUtilsLocal.impersonate(rewardsDistributor)).approve(gauge.address, Misc.MAX_UINT);
          await gauge.connect(
            await DeployerUtilsLocal.impersonate(rewardsDistributor)
          ).deposit_reward_token(rewardToken, amount);

          // register TETU as reward token in the strategy
          await strat.connect(
            await DeployerUtilsLocal.impersonate(await strat.controller())
          ).setRewardTokens([rewardToken]);

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
      const hw = new BalancerBPTUsdcTetuSpecificHardWork(
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
      hw.vaultRt = Misc.ZERO_ADDRESS;
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

  describe("Unit tests ", () => {
    const deployInfo: DeployInfo = new DeployInfo();
    before(async function () {
      await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
    });

    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    const strategyContractName = 'StrategyBalancerTetuUsdc';
    const vaultName = "bptTetuUsdc";
    const UNDERLYING = MaticAddresses.BALANCER_TETU_USDC;

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

          await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).initialize(
            core.controller.address,
            vaultAddress,
            core.controller.address, // tetuBalHolder.address,
            core.controller.address
          );

          await StrategyBalancerTetuUsdc__factory.connect(strategy.address, signer).setPolRatio(50);

          await IFeeRewardForwarder__factory.connect(core.feeRewardForwarder.address, signer).setTokenThreshold(MaticAddresses.BAL_TOKEN, 10_000_000);

          return strategy;
        },
        UNDERLYING,
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
      const hw = new BalancerBPTUsdcTetuSpecificHardWork(
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
      hw.vaultRt = Misc.ZERO_ADDRESS;
      return hw;
    };

    describe("setRewardsRecipient", () => {
      let snapshotBefore: string;
      let snapshot: string;
      let signer: SignerWithAddress;
      let user: SignerWithAddress;
      let vault: ISmartVault;
      let strategy: IStrategy;
      let userBalance: BigNumber;

      before(async function () {
        const start = Date.now();
        snapshotBefore = await TimeUtils.snapshot();
        signer = await DeployerUtilsLocal.impersonate();
        user = (await ethers.getSigners())[1];
        const core = deployInfo.core as CoreContractsWrapper;

        const data = await deployer(signer);
        vault = data[0];
        strategy = data[1];

        // if (forwarderConfigurator !== null) {
        //   await forwarderConfigurator(core.feeRewardForwarder);
        // }

        if (ppfsDecreaseAllowed) {
          await core.vaultController.changePpfsDecreasePermissions([vault.address], true);
        }
        const firstRt = (await vault.rewardTokens())[0];
        if (firstRt && firstRt.toLowerCase() === core.psVault.address.toLowerCase()) {
          await VaultUtils.addRewardsXTetu(signer, vault, core, 1);
        }

        // set class variables for keep objects links
        deployInfo.signer = signer;
        deployInfo.user = user;
        deployInfo.underlying = UNDERLYING;
        deployInfo.vault = vault;
        deployInfo.strategy = strategy;

        // get underlying
        if (await core.controller.isValidVault(UNDERLYING)) {
          console.log('underlying is a vault, need to wrap into xToken');
          const svUnd = ISmartVault__factory.connect(UNDERLYING, signer);
          const svUndToken = await svUnd.underlying();
          const svUndTokenBal = await StrategyTestUtils.getUnderlying(
            svUndToken,
            deposit,
            user,
            deployInfo?.tools?.calculator as IPriceCalculator,
            [signer.address],
          );
          console.log('svUndTokenBal', svUndTokenBal.toString());
          await VaultUtils.deposit(signer, svUnd, svUndTokenBal);
          await VaultUtils.deposit(user, svUnd, svUndTokenBal);
          userBalance = await TokenUtils.balanceOf(UNDERLYING, signer.address);
        } else {
          userBalance = await StrategyTestUtils.getUnderlying(
            UNDERLYING,
            deposit,
            user,
            deployInfo?.tools?.calculator as IPriceCalculator,
            [signer.address],
          );
        }
        await UniswapUtils.wrapNetworkToken(signer);
        Misc.printDuration('Test Preparations completed', start);
      });

      beforeEach(async function () {
        snapshot = await TimeUtils.snapshot();
      });

      afterEach(async function () {
        await TimeUtils.rollback(snapshot);
      });

      after(async function () {
        await TimeUtils.rollback(snapshotBefore);
      });

      it("should set expected value if connected as controller", async () => {
        const core = deployInfo.core as CoreContractsWrapper;
        const newRecipient = ethers.Wallet.createRandom().address;
        const st: StrategyBalancerTetuUsdc = StrategyBalancerTetuUsdc__factory.connect(strategy.address, await DeployerUtilsLocal.impersonate(core.controller.address));
        await st.setRewardsRecipient(newRecipient);
        expect(await st.rewardsRecipient()).eq(newRecipient);
      });

      it("should set expected value if connected as governance", async () => {
        const core = deployInfo.core as CoreContractsWrapper;
        const newRecipient = ethers.Wallet.createRandom().address;
        const st = (await strategy as StrategyBalancerTetuUsdc).connect(
          await DeployerUtilsLocal.impersonate(await core.controller.governance())
        );
        await st.setRewardsRecipient(newRecipient);
        expect(await st.rewardsRecipient()).eq(newRecipient);
      });

      it("should set expected value if connected as vault", async () => {
        const newRecipient = ethers.Wallet.createRandom().address;
        const st = (await strategy as StrategyBalancerTetuUsdc).connect(
          await DeployerUtilsLocal.impersonate(vault.address)
        );
        await st.setRewardsRecipient(newRecipient);
        expect(await st.rewardsRecipient()).eq(newRecipient);
      });

      it("should revert if not vault|controller|governance", async () => {
        const caller = ethers.Wallet.createRandom().address;
        const newRecipient = ethers.Wallet.createRandom().address;
        const st = (await strategy as StrategyBalancerTetuUsdc).connect(await DeployerUtilsLocal.impersonate(caller));
        await expect(st.setRewardsRecipient(newRecipient)).revertedWith("SB: Not Gov or Vault");
      });
    });
  });
});
