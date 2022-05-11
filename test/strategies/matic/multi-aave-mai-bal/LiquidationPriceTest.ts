import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {BigNumber} from "ethers";
import {TokenUtils} from "../../../TokenUtils";
import {
  IStrategy,
  StrategyAaveMaiBal,
  MaiStablecoinPipe,
  IErc20Stablecoin,
  ISmartVault,
  MaiStablecoinPipe__factory, IErc20Stablecoin__factory
} from "../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DeployInfo} from "../../DeployInfo";
import {AMBUtils} from "./AMBUtils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {VaultUtils} from "../../../VaultUtils";
import {TestAsserts} from "../../../TestAsserts";

const {expect} = chai;
chai.use(chaiAsPromised);

export class LiquidationPriceTest extends SpecificStrategyTest {

  public async do(
    deployInfo: DeployInfo
  ): Promise<void> {
    it("Liquidation Price", async () => {
      const signer = deployInfo?.signer as SignerWithAddress;
      const user = deployInfo?.user as SignerWithAddress;
      const underlying = deployInfo?.underlying as string;
      const vault = deployInfo?.vault as ISmartVault;
      const strategy = deployInfo?.strategy as IStrategy;
      await AMBUtils.refuelMAI(signer, strategy.address);
      const bal = await TokenUtils.balanceOf(underlying, user.address);
      const strategyAaveMaiBal = deployInfo.strategy as StrategyAaveMaiBal;

      console.log('>>>Liquidation Price');

      const liqPrice1 = await strategyAaveMaiBal.liquidationPrice()
      console.log('liqPrice1     ', liqPrice1.toString());

      await VaultUtils.deposit(user, vault, BigNumber.from(bal));

      const percentage = await strategyAaveMaiBal.collateralPercentage()
      console.log('percentage    ', percentage.toString());
      const liqPrice2 = await strategyAaveMaiBal.liquidationPrice()
      console.log('liqPrice2     ', liqPrice2.toString());

      const maiStbPipe = await strategyAaveMaiBal.pipes(2);
      const maiStbPipeCtr = MaiStablecoinPipe__factory.connect(maiStbPipe, signer);
      const _targetPercentage = await maiStbPipeCtr.targetPercentage()
      const _stablecoin = await maiStbPipeCtr.stablecoin()

      const stablecoin = IErc20Stablecoin__factory.connect(_stablecoin, signer);
      const currPrice = await stablecoin.getEthPriceSource()
      console.log('currPrice     ', currPrice.toString());

      const liqPercentage = await stablecoin._minimumCollateralPercentage()
      console.log('liqPercentage ', liqPercentage.toString());

      const targetLiqPrice = currPrice.div(_targetPercentage).mul(liqPercentage)
      console.log('targetLiqPrice', targetLiqPrice.toString());

      expect(liqPrice1).to.be.equal(0)
      TestAsserts.closeTo(liqPrice2, targetLiqPrice, 1, 8);
    });

  }

}
