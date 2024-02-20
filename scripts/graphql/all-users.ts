import { DocumentNode, gql } from '@apollo/client/core';

export function getAllUsersQuery(): DocumentNode {
  return gql`
      query GetAllUsers($userAdr: String!) {
          userEntities(
              where:{id_gt:$userAdr}
              first: 1000
              orderBy: id
              orderDirection: desc
          ) {
              id
          }
      }
  `;
}