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
    ITetuLiquidator__factory,
    StrategyBalancerBoost__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {ethers} from "hardhat";

describe('BalancerBoostUniversalTest', async () => {
    // [underlying, poolId, gauge, depositToken]
    const targets = [
        [MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3, MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_ID, MaticAddresses.BALANCER_MATIC_BOOSTED_AAVE3_GAUGE, MaticAddresses.stMATIC_TOKEN, ],
        [MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3, MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_ID, MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_GAUGE, MaticAddresses.MATIC_X, ],
        [MaticAddresses.BALANCER_WSTETH_BOOSTED_AAVE3, MaticAddresses.BALANCER_WSTETH_BOOSTED_AAVE3_ID, MaticAddresses.BALANCER_WSTETH_BOOSTED_AAVE3_GAUGE, MaticAddresses.WSTETH_TOKEN, ],
        [MaticAddresses.BALANCER_USD_TETU_BOOSTED, MaticAddresses.BALANCER_USD_TETU_BOOSTED_ID, MaticAddresses.BALANCER_USD_TETU_BOOSTED_GAUGE, MaticAddresses.bb_t_USDC_TOKEN, ],
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

        // todo bridge boost power from BalLocker [mainnet] to GaugeDepositor [polygon]

        // [mainnet] Tetu governance multisig 0x4bE13bf2B983C31414b358C634bbb61230c332A7 calls setNetworkRemapping on the VotingEscrowRemapper 0x83E443EF4f9963C77bd860f94500075556668cb8 with value 484288978083135 and params:
        // localUser: 0x9cC56Fa7734DA21aC88F6a816aF10C5b898596Ce (BalLocker)
        // remoteUser: <deployed GaugeDepositor>
        // chainId: 109

        // [polygon]
        //  ...
        // OmniVotingEscrowChild 0xE241C6e48CA045C7f631600a0f1403b2bFea05ad balanceOf <deployed GaugeDepositor> == BalLocker VE balance
        // Boost Delegation V2 0xD961E30156C2E0D0d925A0De45f931CB7815e970 balanceOf <deployed GaugeDepositor> == BalLocker voting power

        // route for bb-t-usdc
        const gov = await DeployerUtilsLocal.impersonate('0xbbbbb8c4364ec2ce52c59d2ed3e56f307e529a94')
        const liquidator = ITetuLiquidator__factory.connect('0xC737eaB847Ae6A92028862fE38b828db41314772', gov)
        await liquidator.addLargestPools([{
            pool: MaticAddresses.bb_t_USDC_TOKEN,
            swapper: '0xa448329A95970194567fCa4B6B1B0bbA4aC0bF66',
            tokenIn: MaticAddresses.bb_t_USDC_TOKEN,
            tokenOut: MaticAddresses.USDC_TOKEN,
        }], true)
    });

    targets.forEach(t => {
        // **********************************************
        // ************** CONFIG*************************
        // **********************************************
        const strategyContractName = 'StrategyBalancerBoost';
        const vaultName = t[0];
        const underlying = t[0];

        const buyBackRatio = 8_00;
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
                    await StrategyBalancerBoost__factory.connect(strategy.address, signer).initialize(
                        core.controller.address,
                        vaultAddress,
                        t[1],
                        t[2],
                        buyBackRatio,
                        t[3],
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