// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface IVotingSnapshot {
  struct Vote {
    address poolAddress;
    int256 weight;
  }

  function vote(address, int256) external;

  function votesLength() external view returns (uint);

  function votesLengthByAccount(address acc) external view returns (uint);

  function accountVoteByIndex(address acc, uint id) external view returns (Vote memory);

  function vote(Vote[] memory) external;

  function removeVote(address) external;

  function resetVotes() external;

  function resetVotes(address) external;

  function setVoteDelegate(address) external;

  function clearVoteDelegate() external;

  function voteDelegateByAccount(address) external view returns (address);

  function votesByAccount(address) external view returns (Vote[] memory);

  function voteWeightTotalByAccount(address) external view returns (uint256);

  function voteWeightUsedByAccount(address) external view returns (uint256);

  function voteWeightAvailableByAccount(address)
  external
  view
  returns (uint256);
}
