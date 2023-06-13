//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

interface IConvexGauge {

  struct Reward {
    address distributor;
    uint256 period_finish;
    uint256 rate;
    uint256 last_update;
    uint256 integral;
  }

  /// @notice Deposit `_value` LP tokens
  /// @dev Depositting also claims pending reward tokens
  /// @param _value Number of tokens to deposit
  function deposit(uint _value) external;

  function deposit(uint _value, address receiver, bool claim) external;

  /// @notice Get the number of claimable reward tokens for a user
  /// @dev This call does not consider pending claimable amount in `reward_contract`.
  ///      Off-chain callers should instead use `claimable_rewards_write` as a
  ///      view method.
  /// @param _addr Account to get reward amount for
  /// @param _token Token to get reward amount for
  /// @return uint256 Claimable reward token amount
  function claimable_reward(address _addr, address _token) external view returns (uint256);

  /// @notice Get the number of already-claimed reward tokens for a user
  /// @param _addr Account to get reward amount for
  /// @param _token Token to get reward amount for
  /// @return uint256 Total amount of `_token` already claimed by `_addr`
  function claimed_reward(address _addr, address _token) external view returns (uint256);

  /// @notice Withdraw `_value` LP tokens
  /// @dev Withdrawing also claims pending reward tokens
  /// @param _value Number of tokens to withdraw
  function withdraw(uint _value, bool) external;

  function claim_rewards(address _addr, address receiver) external;

  function claim_rewards(address _addr) external;

  function balanceOf(address) external view returns (uint);

  function manager() external view returns (address);

  function lp_token() external view returns (address);

  function deposit_reward_token(address reward_token, uint256 amount) external;

  function add_reward(address reward_token, address distributor) external;

  function set_reward_distributor(address reward_token, address distributor) external;

  function reward_tokens(uint id) external view returns (address);

  function reward_data(address token) external view returns (Reward memory);

  function reward_count() external view returns (uint);

  function initialize(address lp, address manager_) external;
}
