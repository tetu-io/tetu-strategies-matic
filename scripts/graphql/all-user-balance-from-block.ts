import { DocumentNode, gql } from '@apollo/client/core';

export function getAllUserBlockFromBlockQuery(): DocumentNode {
  return gql`
      query GetAllUserBlockFromBlock($lastBlockNumber: BigInt!) {
          userBalanceHistoryEntities(
              where:{
                  user_not: "0x0000000000000000000000000000000000000000"
                  blockNumber_lte: $lastBlockNumber
              }
              first: 1000
              orderBy: blockNumber
              orderDirection: desc
          ) {
              balance
              blockNumber
              user {
                  id
              }
          }
      }
  `;
}