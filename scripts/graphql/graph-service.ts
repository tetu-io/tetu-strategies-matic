import { UserEntity } from '../../generated/gql';
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
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