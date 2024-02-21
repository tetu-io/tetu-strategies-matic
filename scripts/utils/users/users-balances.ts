import { getAllUserBalanceByBlock } from '../../graphql/graph-service';
import { UserBalanceHistoryEntity } from '../../../generated/gql';
import { MaticAddresses } from '../../addresses/MaticAddresses';
import { formatUnits } from 'ethers/lib/utils';
import { Addresses } from '../../../addresses';
import { Misc } from '../tools/Misc';
import { ERC20__factory, IERC20__factory, Multicall__factory } from '../../../typechain';
import { ethers } from 'hardhat';

const VALIDATE_USER_BALANCE_ON_CHAIN = process.env.TETU_VALIDATE_USER_BALANCE_ON_CHAIN === 'true';
const VALIDATE_TOTAL_SUPPLY = process.env.TETU_VALIDATE_TOTAL_SUPPLY === 'true';

export async function getAllUserByBlock(block: number): Promise<UserBalanceHistoryEntity[]> {
  const usersBalances = await getAllUserByBlockInGraph(block);
  await validateBalances(usersBalances, block);
  return usersBalances;
}


async function getAllUserByBlockInGraph(block: number): Promise<UserBalanceHistoryEntity[]> {
  const userBalancesHistory = await getAllUserBalanceByBlock(block);
  return Object.values(userBalancesHistory.reduce((uniqueRecords, record) => {
    if (!uniqueRecords[record.user.id] || uniqueRecords[record.user.id].blockNumber < record.blockNumber) {
      uniqueRecords[record.user.id] = record;
    }
    return uniqueRecords;
  }, {} as { [key: string]: UserBalanceHistoryEntity }));
}

async function validateBalances(usersBalances: UserBalanceHistoryEntity[], block: number) {
  console.log('User balances size: ', usersBalances.length);

  if (VALIDATE_TOTAL_SUPPLY) {
    await validateTotalSupply(usersBalances, block);
  }

  if (VALIDATE_USER_BALANCE_ON_CHAIN) {
    await validateUserBalancesOnChain(usersBalances, block);
  }
}

async function validateTotalSupply(usersBalances: UserBalanceHistoryEntity[], block: number) {
  const totalSupply = await totalSupplyAt(MaticAddresses.xtetuBAL_TOKEN, block);
  const totalSupplyFormatted = +formatUnits(totalSupply);
  const sumBalance = usersBalances.reduce((acc, { balance }) => acc + +formatUnits(balance), 0);

  console.log('xtetuBAL total supply', totalSupplyFormatted);
  console.log('xtetuBAL sum balance from subgraph', sumBalance);

  if (totalSupplyFormatted.toFixed(2) !== sumBalance.toFixed(2)) {
    console.log('Total supply and sum balance are not equal');
  }
}

async function validateUserBalancesOnChain(usersBalances: UserBalanceHistoryEntity[], block: number) {
  const usersBalancesOnChain = await getAllBalance(usersBalances, block);

  usersBalances.forEach((userBalance, index) => {
    const amount = +formatUnits(userBalance.balance);
    const onChainAmount = +formatUnits(BigInt(usersBalancesOnChain.returnData[index]));
    // console.log(`User ${userBalance.user.id} balance: ${amount}, on chain: ${onChainAmount}`)

    if (onChainAmount !== amount) {
      console.error('on chain amount', userBalance.user.id, onChainAmount, '!==', amount);
    }
  });
}

async function getAllBalance(userBalances: UserBalanceHistoryEntity[], block: number) {
  const multicall = getMulticallAddress();
  const calls = userBalances.map(({ user: { id } }) => ({
    target: MaticAddresses.xtetuBAL_TOKEN,
    callData: ERC20__factory.createInterface().encodeFunctionData('balanceOf', [id]),
  }));

  return Multicall__factory.connect(multicall, (await ethers.getSigners())[0]).callStatic.aggregate(calls, { blockTag: block });
}

function getMulticallAddress() {
  const multicall = Addresses.TOOLS.get(`${Misc.getChainId()}`)?.multicall;
  if (!multicall) {
    throw new Error(`Multicall address not found for chainId ${Misc.getChainId()}`);
  }
  return multicall;
}

async function totalSupplyAt(address: string, block: number) {
  return IERC20__factory.connect(address, ethers.provider).totalSupply({ blockTag: block });
}
