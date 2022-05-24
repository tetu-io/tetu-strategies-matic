import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {
  IERC20__factory,
  IPoolVoting__factory,
  ISmartVault,
  IVotingMesh__factory,
  MeshStakingStrategyBase__factory,
} from "../../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DeployInfo} from "../../DeployInfo";
import {BigNumber, utils} from "ethers";
import {TimeUtils} from "../../../TimeUtils";
import {TokenUtils} from "../../../TokenUtils";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {formatUnits, parseUnits} from "ethers/lib/utils";

const {expect} = chai;
chai.use(chaiAsPromised);

export class VeMeshSpecificTests extends SpecificStrategyTest {

  public async do(
    deployInfo: DeployInfo
  ): Promise<void> {

    it("Governance should be able to vote", async () => {
      const signer = deployInfo.signer as SignerWithAddress;
      const strategy = MeshStakingStrategyBase__factory.connect(deployInfo.strategy?.address || '', signer);
      const vault = deployInfo.vault as ISmartVault;
      const poolVoting = IPoolVoting__factory.connect("0x705b40Af8CeCd59406cF630Ab7750055c9b137B9", signer);
      const votingMesh = IVotingMesh__factory.connect("0x176b29289f66236c65C7ac5DB2400abB5955Df13", signer);
      const underlying = await vault.underlying();
      const meshToken = IERC20__factory.connect(underlying, signer);
      const depositAmount = BigNumber.from(10).pow(19);
      await meshToken.approve(vault.address, depositAmount);
      await vault.deposit(depositAmount);
      const lpAddressToVote = "0x6Ffe747579eD4E807Dec9B40dBA18D15226c32dC";

      console.log(`MESH balance in strategy: ${await votingMesh.lockedMESH(strategy.address)}`);
      console.log(`vMESH balance in strategy: ${await votingMesh.balanceOf(strategy.address)}`);
      expect(await votingMesh.lockedMESH(strategy.address)).is.eq(depositAmount);
      expect(await votingMesh.balanceOf(strategy.address)).is.eq(depositAmount.mul(8));

      await strategy.addVoting(lpAddressToVote, 10)
      expect(await poolVoting.userVotingPoolCount(strategy.address)).is.eq(1)

      // this part needs to be tested manually because of comment from the team:
      // It is not meant to compare timestamp and blocknumber directly on pool voting.
      // when a certain timestamp passes, the epoch needs to be increased in governance, - therefore, it may be difficult to test it.

      // await TimeUtils.advanceNBlocks(999);
      //
      // await strategy.removeAllVoting()
      // expect(await poolVoting.userVotingPoolCount(strategy.address)).is.eq(0)
    });

    it("Autoclimed rewards after the deposit should not change ppfs and be liquidated to the vault.", async () => {
      const largeApproval = parseUnits('100000')
      const signer = deployInfo.signer as SignerWithAddress;
      const vault = deployInfo.vault as ISmartVault;

      const underlying = await vault.underlying();
      const tetuMeshAddress = '0xDcB8F34a3ceb48782c9f3F98dF6C12119c8d168a'
      const tetuMeshToken = IERC20__factory.connect(tetuMeshAddress, signer);
      const vaultRewardBalanceBefore = await tetuMeshToken.balanceOf(vault.address);
      console.log(`vaultRewardBalanceBefore ${vaultRewardBalanceBefore}`);
      const meshToken = IERC20__factory.connect(underlying, signer);
      const meshBal = await meshToken.balanceOf(signer.address)
      console.log(`meshBal ${meshBal}`);
      const depositAmount1 = meshBal.div(2)
      await meshToken.approve(vault.address, largeApproval);
      const expectedPPFS = parseUnits('10');
      console.log(`Deposit 1 ...`)
      await vault.depositAndInvest(depositAmount1);
      console.log(`PPFS 1: ${await vault.getPricePerFullShare()}`)
      console.log(`Underlying balance 1: ${await vault.underlyingBalanceWithInvestment()}`)
      expect(await vault.getPricePerFullShare()).is.eq(expectedPPFS);
      await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 30);
      const depositAmount2 = meshBal.div(2)
      console.log(`Deposit 2 ...`)
      await vault.depositAndInvest(depositAmount2);
      console.log(`PPFS 2: ${await vault.getPricePerFullShare()}`)
      console.log(`Underlying balance 2: ${await vault.underlyingBalanceWithInvestment()}`)
      expect(await vault.getPricePerFullShare()).is.eq(expectedPPFS);
      const vaultRewardBalanceAfter = await tetuMeshToken.balanceOf(vault.address);
      console.log(`vaultRewardBalanceAfter ${vaultRewardBalanceAfter}`);
      expect(vaultRewardBalanceAfter).is.gt(vaultRewardBalanceBefore);
    })

    it("In case of extra token in strategy PPFS should be adjusted", async () => {
      const signer = deployInfo.signer as SignerWithAddress;
      const vault = deployInfo.vault as ISmartVault;
      const underlying = await vault.underlying();
      const strategy = MeshStakingStrategyBase__factory.connect(deployInfo.strategy?.address || '', signer);
      const meshToken = IERC20__factory.connect(underlying, signer);
      const depositAmount1 = BigNumber.from(104).mul(BigNumber.from(10).pow(17))
      await meshToken.approve(vault.address, depositAmount1.mul(100000));
      const expectedPPFS = BigNumber.from(10).pow(18);
      console.log(`Deposit 1 ...`)
      await vault.deposit(depositAmount1);
      console.log(`PPFS 1: ${await vault.getPricePerFullShare()}`)
      console.log(`Underlying balance 1: ${await vault.underlyingBalanceWithInvestment()}`)
      expect(await vault.getPricePerFullShare()).is.eq(expectedPPFS);
      await TimeUtils.advanceBlocksOnTs(60 * 60 * 24);
      const depositAmount2 = BigNumber.from(107).mul(BigNumber.from(10).pow(17))
      await TokenUtils.getToken(MaticAddresses.MESH_TOKEN, strategy.address, utils.parseUnits('1000'))
      // signer = await DeployerUtilsLocal.impersonate(await strategy.controller());
      // for some reason this call failes
      // await vault.connect(signer).changePpfsDecreaseAllowed(true);
      console.log(`Deposit 2 ...`)
      await vault.deposit(depositAmount2);
      console.log(`PPFS 2: ${await vault.getPricePerFullShare()}`)
      console.log(`Underlying balance 2: ${await vault.underlyingBalanceWithInvestment()}`)
      expect(await vault.getPricePerFullShare()).is.eq(expectedPPFS);
      const controller = deployInfo.core?.controller;
      if (controller != null) {
        const governance = await controller.governance();
        expect(await meshToken.balanceOf(governance)).is.gt(0);
      }
    })

    it("Voting rewards liquidation", async () => {
      const signer = deployInfo.signer as SignerWithAddress;
      const vault = deployInfo.vault as ISmartVault;
      const underlying = await vault.underlying();
      const strategy = MeshStakingStrategyBase__factory.connect(deployInfo.strategy?.address || '', signer);
      const tetuMeshAddress = '0xDcB8F34a3ceb48782c9f3F98dF6C12119c8d168a';
      const meshToken = IERC20__factory.connect(underlying, signer);
      const tetuMeshToken = IERC20__factory.connect(tetuMeshAddress, signer);
      const vaultRewardBalanceBefore = await tetuMeshToken.balanceOf(vault.address);
      const depositAmount1 = await meshToken.balanceOf(signer.address);
      await meshToken.approve(vault.address, depositAmount1);
      const lpAddressToVote = "0x6Ffe747579eD4E807Dec9B40dBA18D15226c32dC";
      await vault.deposit(depositAmount1);
      await strategy.addVoting(lpAddressToVote, 4000)
      await strategy.updateRewardTokensFromVoting([MaticAddresses.WMATIC_TOKEN, MaticAddresses.USDC_TOKEN]);
      await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 30);
      // for some reason no rewards from voting, emulating by transfer
      await TokenUtils.getToken(MaticAddresses.WMATIC_TOKEN, strategy.address, utils.parseUnits('100'))
      await vault.doHardWork()
      const vaultRewardBalanceAfter = await tetuMeshToken.balanceOf(vault.address);
      console.log(`vaultRewardBalanceAfter ${vaultRewardBalanceAfter}`);
      expect(vaultRewardBalanceAfter).is.gt(vaultRewardBalanceBefore);
    })
  }

}
