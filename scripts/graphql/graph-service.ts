import { UserBalanceHistoryEntity } from '../../generated/gql';
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { getUserBalanceByBlockQuery } from './user-balance-by-block';

function getSubgraphUrl() {
  return process.env.SUBGRAPH_URL;
}


const httpLink = createHttpLink({
  uri: getSubgraphUrl() ?? 'no_url',
  fetch,
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});


export async function getUserBalanceByBlock(userAdr: string, block: number): Promise<UserBalanceHistoryEntity[]> {
  const data = await client.query({
    variables: { userAdr, block },
    query: getUserBalanceByBlockQuery(),
  });
  return data.data.userBalanceHistoryEntities;
}