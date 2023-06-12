import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {startConvexStratTest} from "./utils/UniversalConvexStrategyTest";
import {
    ITetuLiquidator__factory,
    IPriceCalculator__factory,
    ITetuLiquidatorController__factory,
} from "../../../../typechain";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
    .env('TETU')
    .options({
        disableStrategyTests: {
            type: "boolean",
            default: false,
        },
        deployCoreContracts: {
            type: "boolean",
            default: false,
        },
        hardhatChainId: {
            type: "number",
            default: 137
        },
    }).argv;


chai.use(chaiAsPromised);


describe('Convex am3CRV_amWBTC_amWETH tests', async () => {
    if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
        return;
    }
    const underlying = MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN;
    const strategyName = 'ConvexStrategyAm3CRVamWBTCamWETH';
    const tokenName = 'am3CRV_amWBTC_amWETH';

    const deployInfo: DeployInfo = new DeployInfo();
    before(async function () {
        await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);

        if (deployInfo.core) {
            // const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
            // const govSigner = await DeployerUtilsLocal.impersonate('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94');

            // await ITetuLiquidator__factory.connect(LIQUIDATOR, govSigner).addLargestPools([
            //     {
            //         pool: '0xa138341185a9D0429B0021A11FB717B225e13e1F',
            //         swapper: '0xCB24fCa15e04BB66061dF3d7229929bB306ecA71',
            //         tokenIn: '0xb5DFABd7fF7F83BAB83995E72A52B97ABb7bcf63',
            //         tokenOut: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
            //     },
            //     {
            //         pool: '0x0fcc19aa4128ab5a2664ad7bd2eb925708610704',
            //         swapper: '0x7b505210a0714d2a889E41B59edc260Fa1367fFe',
            //         tokenIn: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
            //         tokenOut: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            //     }
            // ], true);
            // const tools = await DeployerUtilsLocal.getToolsAddresses();
            // const calculator = IPriceCalculator__factory.connect(tools.calculator, govSigner);
            // console.log('!!!!! start getPriceWithDefaultOutput (0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3) ', calculator.address);
            // let result = await calculator.getPriceWithDefaultOutput('0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3');
            // console.log('result ', result);
        }
    });

    await startConvexStratTest(
        strategyName,
        underlying,
        tokenName,
        deployInfo
    );
});
