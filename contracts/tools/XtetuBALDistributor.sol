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

  /// @dev Default epoch duration using for check distribution frequency
  uint internal constant EPOCH_DURATION = 2 weeks;
  IPriceCalculator internal constant PRICE_CALCULATOR = IPriceCalculator(0x0B62ad43837A69Ad60289EEea7C6e907e759F6E8);
  address internal constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
  address internal constant X_tetuBAL = 0x915E49F7CD8B2b5763759c23D9463A74d5b5C1D5;

  // *************************************************************
  //                        VARIABLES
  // *************************************************************

  /// @dev Operators are able to distribute and setup vault APR.
  mapping(address => bool) public operators;
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
    require(operators[msg.sender], "FORBIDDEN");
    _;
  }

  // *************************************************************
  //                        GOV
  // *************************************************************

  /// @notice Setup new operator or remove existing.
  /// @param _operator The operator address
  /// @param _status The status of the operator
  function changeOperatorStatus(address _operator, bool _status) external onlyGov {
    operators[_operator] = _status;
  }

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
  /// @param recipientsUSDC An array of recipient addresses for USDC rewards
  /// @param amountsUSDC An array of amounts to be distributed to the USDC recipients
  /// @param recipientsXtetuBAL An array of recipient addresses for xTetuBAL rewards
  /// @param amountsXtetuBAL An array of amounts to be distributed to the xTetuBAL recipients
  /// @param vaultTVLUSD The vault's total value locked (TVL) in USD at the block of the snapshot.
  function distribute(
    address[] calldata recipientsUSDC,
    uint[] calldata amountsUSDC,
    address[] calldata recipientsXtetuBAL,
    uint[] calldata amountsXtetuBAL,
    uint vaultTVLUSD
  ) external onlyOperator {
    require(recipientsUSDC.length == amountsUSDC.length && recipientsXtetuBAL.length == amountsXtetuBAL.length, "!LENGTH");

    uint epoch = epochCounter + 1;
    uint lastEpochTS = epochTS[epoch - 1];
    require(block.timestamp > (lastEpochTS + EPOCH_DURATION - 2 days), "!TIME");


    uint distributedUSD;

    for (uint i; i < recipientsUSDC.length; i++) {
      IERC20(USDC).safeTransferFrom(msg.sender, recipientsUSDC[i], amountsUSDC[i]);
      distributedUSD += amountsUSDC[i] * 1e18 / 1e6;
    }

    if (recipientsXtetuBAL.length != 0) {
      uint xtetuBALPrice = PRICE_CALCULATOR.getPriceWithDefaultOutput(X_tetuBAL);
      for (uint i; i < recipientsXtetuBAL.length; i++) {
        IERC20(X_tetuBAL).safeTransferFrom(msg.sender, recipientsXtetuBAL[i], amountsXtetuBAL[i]);
        distributedUSD += amountsXtetuBAL[i] * xtetuBALPrice / 1e18;
      }
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
