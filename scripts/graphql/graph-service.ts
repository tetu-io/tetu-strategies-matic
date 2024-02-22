import { UserBalanceHistoryEntity, UserEntity } from '../../generated/gql';
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import { getAllUserBlockFromBlockQuery } from './all-user-balance-from-block';
import { getAllUsersOnBlockQuery } from './all-users-on-block';

function getSubgraphUrl() {
  return process.env.TETU_SUBGRAPH_URL;
}


const httpLink = createHttpLink({
  uri: getSubgraphUrl() ?? 'no_url',
  fetch,
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export async function getAllUsersOnBlock(block: number): Promise<UserEntity[]> {
  let allUsers: UserEntity[] = [];
  let startAddress = '0x0000000000000000000000000000000000000000';
  let hasMore = true;

  while (hasMore) {
    const { data } = await client.query({
      variables: { block, address: startAddress },
      query: getAllUsersOnBlockQuery(),
    });

    if (data.userEntities.length === 1000) {
      startAddress = data.userEntities[data.userEntities.length - 1].id;
      allUsers = [...allUsers, ...data.userEntities];
    } else {
      if (data.userEntities.length > 0) {
        allUsers = [...allUsers, ...data.userEntities];
      }
      hasMore = false;
    }
  }

  return allUsers;
}

export async function getAllUserBalanceByBlock(startBlock: number): Promise<UserBalanceHistoryEntity[]> {
  let allData: UserBalanceHistoryEntity[] = [];
  let lastBlockNumber = startBlock;
  let fetchMore = true;

  while (fetchMore) {
    const { data } = await client.query({
      variables: { lastBlockNumber },
      query: getAllUserBlockFromBlockQuery(),
    });

    const entries = data.userBalanceHistoryEntities;
    if (entries.length === 0) {
      fetchMore = false;
    } else {
      allData = [...allData, ...entries];
      if (entries.length === 1000) {
        lastBlockNumber = entries[entries.length - 1].blockNumber;
      } else {
        lastBlockNumber = entries[entries.length - 1].blockNumber - 1;
      }
    }
  }

  return allData;
}