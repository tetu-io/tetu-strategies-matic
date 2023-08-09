/* tslint:disable:no-trailing-whitespace */
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {
    GaugeDepositor__factory,
    ISmartVault,
    IStrategy,
    StrategyBalancerBoostBPT__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {ethers} from "hardhat";

describe('BalancerBoostBPTUniversalTest', async () => {
    // [underlying, poolId, gauge, depositToken, depositBPTPoolId]
    const targets = [
        [MaticAddresses.BALANCER_POOL_tetuBAL_BPT, MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID, MaticAddresses.BALANCER_GAUGE_tetuBAL_BPT, MaticAddresses.BAL_TOKEN, MaticAddresses.BALANCER_POOL_BAL_ETH_ID, ],
    ]

    const deployInfo: DeployInfo = new DeployInfo();

    let signer0: SignerWithAddress
    let gaugeDepositor: string

    before(async function () {
        await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
        signer0 = (await ethers.getSigners())[0];

        const r = await DeployerUtilsLocal.deployTetuProxyControlled(signer0, 'GaugeDepositor')
        const gd = GaugeDepositor__factory.connect(r[0].address, signer0)
        await gd.initialize(deployInfo.core?.controller.address as string)
        gaugeDepositor = r[0].address
    });

    targets.forEach(t => {
        // **********************************************
        // ************** CONFIG*************************
        // **********************************************
        const strategyContractName = 'StrategyBalancerBoostBPT';
        const vaultName = t[0];
        const underlying = t[0];

        const buyBackRatio = 5_00;
        // add custom liquidation path if necessary
        const forwarderConfigurator = null;
        // only for strategies where we expect PPFS fluctuations
        const ppfsDecreaseAllowed = false;
        // only for strategies where we expect PPFS fluctuations
        const balanceTolerance = 0;
        const finalBalanceTolerance = 0;
        const deposit = 1;
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
                    await StrategyBalancerBoostBPT__factory.connect(strategy.address, signer).initialize(
                        core.controller.address,
                        vaultAddress,
                        t[1],
                        t[2],
                        buyBackRatio,
                        t[3],
                        t[4],
                        gaugeDepositor
                    );

                    await core.controller.setRewardDistribution([strategy.address], true);
                    // await core.vaultController.addRewardTokens([vaultAddress], VAULT_BB_T_USD);

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
            // const hw = new DoHardWorkLoopBase(
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

        universalStrategyTest(
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
    })
})