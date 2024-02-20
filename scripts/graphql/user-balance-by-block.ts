import { DocumentNode, gql } from '@apollo/client/core';

export function getUserBalanceByBlockQuery(): DocumentNode {
  return gql`
      query GetUserBalanceByBlock($userAdr: String!, $block: BigInt!) {
          userBalanceHistoryEntities(
              where:{
                  user: $userAdr
                  blockNumber_lte: $block
              }
              first: 1
              orderBy: blockNumber
              orderDirection: desc
          ) {
              balance
              blockNumber
          }
      }
  `;
}