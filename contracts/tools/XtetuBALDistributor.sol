// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@tetu_io/tetu-contracts/contracts/base/governance/ControllableV2.sol";
import "@tetu_io/tetu-contracts/contracts/openzeppelin/SafeERC20.sol";
import "../interfaces/IPriceCalculator.sol";

/// @title XtetuBALDistributor
/// @notice This contract is responsible for distributing xTetuBAL rewards to recipients.
/// @author belbix
contract XtetuBALDistributor is ControllableV2 {
  using SafeERC20 for IERC20;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  string public constant VERSION = "1.0.1";
  /// @dev Using for check distribution frequency
  uint internal constant MINIMUM_DELAY_BETWEEN_DISTRIBUTION = 2 days;
  IPriceCalculator internal constant PRICE_CALCULATOR = IPriceCalculator(0x0B62ad43837A69Ad60289EEea7C6e907e759F6E8);
  address internal constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
  address internal constant X_tetuBAL = 0x915E49F7CD8B2b5763759c23D9463A74d5b5C1D5;
  address internal constant TETU = 0x255707B70BF90aa112006E1b07B9AeA6De021424;

  // *************************************************************
  //                        VARIABLES
  // *************************************************************

  mapping(address => bool) private _deprecated;
  /// @dev The last epoch index.
  uint public epochCounter;
  /// @dev Epoch start timestamp.
  mapping(uint => uint) public epochTS;
  /// @dev APR for each epoch.
  mapping(uint => uint) public epochAPR;
  /// @dev USD value of distributed rewards for each epoch.
  mapping(uint => uint) public epochDistributedUSD;
  /// @dev USD value of vault TVL at the block of the snapshot for each epoch.
  mapping(uint => uint) public epochTVLUSD;
  /// @dev On-chain indicator for off-chain calculation that the user desired receive xtetuBAL instead of USDC airdrop.
  mapping(address => bool) public useXtetuBal;

  // *************************************************************
  //                        INIT
  // *************************************************************

  function initialize(address _controller) external initializer {
    initializeControllable(_controller);
  }

  modifier onlyGov() {
    require(_isGovernance(msg.sender), "FORBIDDEN");
    _;
  }

  modifier onlyOperator() {
    require(IController(_controller()).isHardWorker(msg.sender), "FORBIDDEN");
    _;
  }

  // *************************************************************
  //                        GOV
  // *************************************************************

  // *************************************************************
  //                        MAIN LOGIC
  // *************************************************************

  /// @notice Return actual APR for xtetuBAL vault
  /// @return The APR of the latest epoch
  function lastAPR() external view returns (uint) {
    return epochAPR[epochCounter];
  }

  /// @dev Anyone can change the status for himself.
  function setUseXtetuBal(bool status) external {
    useXtetuBal[msg.sender] = status;
  }

  /// @notice Manually setup APR in case if something went wrong in distribution.
  /// @param epoch The epoch number
  /// @param _epochTS The epoch timestamp
  /// @param distributedUSD The distributed USD value
  /// @param tvlUSD The TVL USD value
  function setEpochMeta(
    uint epoch,
    uint _epochTS,
    uint distributedUSD,
    uint tvlUSD
  ) external onlyOperator {
    _setEpochMeta(epoch, _epochTS, distributedUSD, tvlUSD);
  }

  /// @notice Distributes the rewards to recipients and update the vault APR.
  /// @param recipients An array of recipient addresses
  ///        0 - USDC
  ///        1 - xtetuBAL
  ///        2 - TETU
  /// @param amounts An array of amounts to be distributed
  ///        0 - USDC
  ///        1 - xtetuBAL
  ///        2 - TETU
  /// @param vaultTVLUSD The vault's total value locked (TVL) in USD at the block of the snapshot.
  function distribute(
    address[][] calldata recipients,
    uint[][] calldata amounts,
    uint vaultTVLUSD
  ) external onlyOperator {
    require(
      recipients.length == 3
      && amounts.length == 3
      && recipients[0].length == amounts[0].length
      && recipients[1].length == amounts[1].length
      && recipients[2].length == amounts[2].length,
      "!LENGTH");

    uint epoch = epochCounter + 1;
    require(block.timestamp > (epochTS[epoch - 1] + MINIMUM_DELAY_BETWEEN_DISTRIBUTION), "!TIME");

    uint distributedUSD;

    if (recipients[0].length != 0) {
      distributedUSD += _distribute(
        recipients[0],
        amounts[0],
        USDC,
        6
      );
    }

    if (recipients[1].length != 0) {
      distributedUSD += _distribute(
        recipients[1],
        amounts[1],
        X_tetuBAL,
        18
      );
    }

    if (recipients[2].length != 0) {
      distributedUSD += _distribute(
        recipients[2],
        amounts[2],
        TETU,
        18
      );
    }

    _setEpochMeta(
      epoch,
      block.timestamp,
      distributedUSD,
      vaultTVLUSD
    );

    // setup new values
    // epochAPR epochDistributedUSD epochTVLUSD was updated in _setEpochMeta()
    epochCounter = epoch;
    epochTS[epoch] = block.timestamp;
  }

  function _distribute(
    address[] calldata recipients,
    uint[] calldata amounts,
    address token,
    uint tokenDecimals
  ) internal returns (uint) {
    uint tokenPrice = PRICE_CALCULATOR.getPriceWithDefaultOutput(token);
    uint distributedUSD;
    for (uint i; i < recipients.length; i++) {
      IERC20(token).safeTransferFrom(msg.sender, recipients[i], amounts[i]);
      distributedUSD += (amounts[i] * 1e18 / (10 ** tokenDecimals)) * tokenPrice / 1e18;
    }
    return distributedUSD;
  }

  // *************************************************************
  //                        INTERNAL LOGIC
  // *************************************************************

  function _setEpochMeta(
    uint epoch,
    uint _epochTS,
    uint distributedUSD,
    uint tvlUSD
  ) internal {
    uint duration;
    if (epoch > 1) {
      uint prevTS = epochTS[epoch - 1];
      require(prevTS < _epochTS, "Wrong prev epoch TS");
      duration = _epochTS - prevTS;
    } else {
      duration = 2 weeks;
    }

    uint apr = _computeApr(tvlUSD, distributedUSD, duration);

    // setup new values
    epochAPR[epoch] = apr;
    epochDistributedUSD[epoch] = distributedUSD;
    epochTVLUSD[epoch] = tvlUSD;
  }

  /// @dev https://www.investopedia.com/terms/a/apr.asp
  ///      TVL and rewards should be in the same currency and with the same decimals
  function _computeApr(uint tvl, uint rewards, uint duration) internal pure returns (uint) {
    if (tvl == 0 || duration == 0) {
      return 0;
    }
    uint rewardsPerTvlRatio = rewards * 1e18 / tvl * 1e18;
    return rewardsPerTvlRatio * 1e18 / (duration * 1e18 / 1 days) * uint(36500) / 1e18;
  }

}
