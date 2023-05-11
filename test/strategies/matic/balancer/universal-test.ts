import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {ISmartVault, IStrategy, StrategyBalancerUniversal__factory} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {BalancerBPTSpecificHardWork} from "./BalancerBPTSpecificHardWork";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DeployInfo} from "../../DeployInfo";
import {Misc} from "../../../../scripts/utils/tools/Misc";

export async function balancerUniversalTest(
  deployInfo: DeployInfo,
  underlying: string,
  poolId: string,
  gauge: string,
  isCompound: boolean,
  depositToken: string,
  buyBackRatio: number,
) {

  // **********************************************
  // ************** CONFIG*************************
  // **********************************************

  const strategyContractName = 'StrategyBalancerUniversal';
  const vaultName = "StrategyBalancerUniversal";
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
        await StrategyBalancerUniversal__factory.connect(strategy.address, signer).initialize(
          core.controller.address,
          vaultAddress,
          poolId,
          gauge,
          isCompound,
          buyBackRatio,
          depositToken,
        );


        if (!isCompound) {
          await core.controller.setRewardDistribution([strategy.address], true);
          await core.vaultController.addRewardTokens([vaultAddress], VAULT_BB_T_USD);
        }


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
    if (!isCompound) {
      hw.vaultRt = VAULT_BB_T_USD;
    } else {
      hw.vaultRt = Misc.ZERO_ADDRESS;
    }
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
}
