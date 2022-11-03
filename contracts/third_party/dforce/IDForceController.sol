// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

interface IDForceController {
  event BorrowPaused(address iToken, bool paused);
  event BorrowedAdded(address iToken, address account);
  event BorrowedRemoved(address iToken, address account);
  event MarketAdded(
    address iToken,
    uint256 collateralFactor,
    uint256 borrowFactor,
    uint256 supplyCapacity,
    uint256 borrowCapacity,
    uint256 distributionFactor
  );
  event MarketEntered(address iToken, address account);
  event MarketExited(address iToken, address account);
  event MintPaused(address iToken, bool paused);
  event NewBorrowCapacity(
    address iToken,
    uint256 oldBorrowCapacity,
    uint256 newBorrowCapacity
  );
  event NewBorrowFactor(
    address iToken,
    uint256 oldBorrowFactorMantissa,
    uint256 newBorrowFactorMantissa
  );
  event NewCloseFactor(
    uint256 oldCloseFactorMantissa,
    uint256 newCloseFactorMantissa
  );
  event NewCollateralFactor(
    address iToken,
    uint256 oldCollateralFactorMantissa,
    uint256 newCollateralFactorMantissa
  );
  event NewLiquidationIncentive(
    uint256 oldLiquidationIncentiveMantissa,
    uint256 newLiquidationIncentiveMantissa
  );
  event NewOwner(address indexed previousOwner, address indexed newOwner);
  event NewPauseGuardian(address oldPauseGuardian, address newPauseGuardian);
  event NewPendingOwner(
    address indexed oldPendingOwner,
    address indexed newPendingOwner
  );
  event NewPriceOracle(address oldPriceOracle, address newPriceOracle);
  event NewRewardDistributor(
    address oldRewardDistributor,
    address _newRewardDistributor
  );
  event NewSupplyCapacity(
    address iToken,
    uint256 oldSupplyCapacity,
    uint256 newSupplyCapacity
  );
  event RedeemPaused(address iToken, bool paused);
  event SeizePaused(bool paused);
  event TransferPaused(bool paused);

  function _acceptOwner() external;

  function _addMarket(
    address _iToken,
    uint256 _collateralFactor,
    uint256 _borrowFactor,
    uint256 _supplyCapacity,
    uint256 _borrowCapacity,
    uint256 _distributionFactor
  ) external;

  function _setAllBorrowPaused(bool _paused) external;

  function _setAllMintPaused(bool _paused) external;

  function _setAllRedeemPaused(bool _paused) external;

  function _setBorrowCapacity(address _iToken, uint256 _newBorrowCapacity)
  external;

  function _setBorrowFactor(address _iToken, uint256 _newBorrowFactorMantissa)
  external;

  function _setBorrowPaused(address _iToken, bool _paused) external;

  function _setCloseFactor(uint256 _newCloseFactorMantissa) external;

  function _setCollateralFactor(
    address _iToken,
    uint256 _newCollateralFactorMantissa
  ) external;

  function _setLiquidationIncentive(uint256 _newLiquidationIncentiveMantissa)
  external;

  function _setMintPaused(address _iToken, bool _paused) external;

  function _setPauseGuardian(address _newPauseGuardian) external;

  function _setPendingOwner(address newPendingOwner) external;

  function _setPriceOracle(address _newOracle) external;

  function _setProtocolPaused(bool _paused) external;

  function _setRedeemPaused(address _iToken, bool _paused) external;

  function _setRewardDistributor(address _newRewardDistributor) external;

  function _setSeizePaused(bool _paused) external;

  function _setSupplyCapacity(address _iToken, uint256 _newSupplyCapacity)
  external;

  function _setTransferPaused(bool _paused) external;

  function _setiTokenPaused(address _iToken, bool _paused) external;

  function afterBorrow(
    address _iToken,
    address _borrower,
    uint256 _borrowedAmount
  ) external;

  function afterFlashloan(
    address _iToken,
    address _to,
    uint256 _amount
  ) external;

  function afterLiquidateBorrow(
    address _iTokenBorrowed,
    address _iTokenCollateral,
    address _liquidator,
    address _borrower,
    uint256 _repaidAmount,
    uint256 _seizedAmount
  ) external;

  function afterMint(
    address _iToken,
    address _minter,
    uint256 _mintAmount,
    uint256 _mintedAmount
  ) external;

  function afterRedeem(
    address _iToken,
    address _redeemer,
    uint256 _redeemAmount,
    uint256 _redeemedUnderlying
  ) external;

  function afterRepayBorrow(
    address _iToken,
    address _payer,
    address _borrower,
    uint256 _repayAmount
  ) external;

  function afterSeize(
    address _iTokenCollateral,
    address _iTokenBorrowed,
    address _liquidator,
    address _borrower,
    uint256 _seizedAmount
  ) external;

  function afterTransfer(
    address _iToken,
    address _from,
    address _to,
    uint256 _amount
  ) external;

  function beforeBorrow(
    address _iToken,
    address _borrower,
    uint256 _borrowAmount
  ) external;

  function beforeFlashloan(
    address _iToken,
    address _to,
    uint256 _amount
  ) external;

  function beforeLiquidateBorrow(
    address _iTokenBorrowed,
    address _iTokenCollateral,
    address _liquidator,
    address _borrower,
    uint256 _repayAmount
  ) external;

  function beforeMint(
    address _iToken,
    address _minter,
    uint256 _mintAmount
  ) external;

  function beforeRedeem(
    address _iToken,
    address _redeemer,
    uint256 _redeemAmount
  ) external;

  function beforeRepayBorrow(
    address _iToken,
    address _payer,
    address _borrower,
    uint256 _repayAmount
  ) external;

  function beforeSeize(
    address _iTokenCollateral,
    address _iTokenBorrowed,
    address _liquidator,
    address _borrower,
    uint256 _seizeAmount
  ) external;

  function beforeTransfer(
    address _iToken,
    address _from,
    address _to,
    uint256 _amount
  ) external;

  function calcAccountEquity(address _account)
  external
  view
  returns (
    uint256,
    uint256,
    uint256,
    uint256
  );

  function closeFactorMantissa() external view returns (uint256);

  function enterMarketFromiToken(address _market, address _account) external;

  function enterMarkets(address[] memory _iTokens)
  external
  returns (bool[] memory _results);

  function exitMarkets(address[] memory _iTokens)
  external
  returns (bool[] memory _results);

  function getAlliTokens()
  external
  view
  returns (address[] memory _alliTokens);

  function getBorrowedAssets(address _account)
  external
  view
  returns (address[] memory _borrowedAssets);

  function getEnteredMarkets(address _account)
  external
  view
  returns (address[] memory _accountCollaterals);

  function hasBorrowed(address _account, address _iToken)
  external
  view
  returns (bool);

  function hasEnteredMarket(address _account, address _iToken)
  external
  view
  returns (bool);

  function hasiToken(address _iToken) external view returns (bool);

  function initialize() external;

  function isController() external view returns (bool);

  function liquidateCalculateSeizeTokens(
    address _iTokenBorrowed,
    address _iTokenCollateral,
    uint256 _actualRepayAmount
  ) external view returns (uint256 _seizedTokenCollateral);

  function liquidationIncentiveMantissa() external view returns (uint256);

  function markets(address)
  external
  view
  returns (
    uint256 collateralFactorMantissa,
    uint256 borrowFactorMantissa,
    uint256 borrowCapacity,
    uint256 supplyCapacity,
    bool mintPaused,
    bool redeemPaused,
    bool borrowPaused
  );

  function owner() external view returns (address);

  function pauseGuardian() external view returns (address);

  function pendingOwner() external view returns (address);

  function priceOracle() external view returns (address);

  function rewardDistributor() external view returns (address);

  function seizePaused() external view returns (bool);

  function transferPaused() external view returns (bool);
}
