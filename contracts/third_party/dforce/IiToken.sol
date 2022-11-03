// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

interface IiToken {
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
  event Borrow(
    address borrower,
    uint256 borrowAmount,
    uint256 accountBorrows,
    uint256 accountInterestIndex,
    uint256 totalBorrows
  );
  event Flashloan(
    address loaner,
    uint256 loanAmount,
    uint256 flashloanFee,
    uint256 protocolFee,
    uint256 timestamp
  );
  event LiquidateBorrow(
    address liquidator,
    address borrower,
    uint256 repayAmount,
    address iTokenCollateral,
    uint256 seizeTokens
  );
  event Mint(
    address sender,
    address recipient,
    uint256 mintAmount,
    uint256 mintTokens
  );
  event NewController(address oldController, address newController);
  event NewFlashloanFee(
    uint256 oldFlashloanFeeRatio,
    uint256 newFlashloanFeeRatio,
    uint256 oldProtocolFeeRatio,
    uint256 newProtocolFeeRatio
  );
  event NewFlashloanFeeRatio(
    uint256 oldFlashloanFeeRatio,
    uint256 newFlashloanFeeRatio
  );
  event NewInterestRateModel(
    address oldInterestRateModel,
    address newInterestRateModel
  );
  event NewOwner(address indexed previousOwner, address indexed newOwner);
  event NewPendingOwner(
    address indexed oldPendingOwner,
    address indexed newPendingOwner
  );
  event NewProtocolFeeRatio(
    uint256 oldProtocolFeeRatio,
    uint256 newProtocolFeeRatio
  );
  event NewReserveRatio(uint256 oldReserveRatio, uint256 newReserveRatio);
  event Redeem(
    address from,
    address recipient,
    uint256 redeemiTokenAmount,
    uint256 redeemUnderlyingAmount
  );
  event RepayBorrow(
    address payer,
    address borrower,
    uint256 repayAmount,
    uint256 accountBorrows,
    uint256 accountInterestIndex,
    uint256 totalBorrows
  );
  event ReservesWithdrawn(
    address admin,
    uint256 amount,
    uint256 newTotalReserves,
    uint256 oldTotalReserves
  );
  event Transfer(address indexed from, address indexed to, uint256 value);
  event UpdateInterest(
    uint256 currentBlockNumber,
    uint256 interestAccumulated,
    uint256 borrowIndex,
    uint256 cash,
    uint256 totalBorrows,
    uint256 totalReserves
  );

  function DOMAIN_SEPARATOR() external view returns (bytes32);

  function PERMIT_TYPEHASH() external view returns (bytes32);

  function _acceptOwner() external;

  function _setController(address _newController) external;

  function _setInterestRateModel(address _newInterestRateModel) external;

  function _setNewFlashloanFeeRatio(uint256 _newFlashloanFeeRatio) external;

  function _setNewProtocolFeeRatio(uint256 _newProtocolFeeRatio) external;

  function _setNewReserveRatio(uint256 _newReserveRatio) external;

  function _setPendingOwner(address newPendingOwner) external;

  function _withdrawReserves(uint256 _withdrawAmount) external;

  function accrualBlockNumber() external view returns (uint256);

  function allowance(address, address) external view returns (uint256);

  function approve(address spender, uint256 amount) external returns (bool);

  function balanceOf(address) external view returns (uint256);

  function balanceOfUnderlying(address _account) external returns (uint256);

  function borrow(uint256 _borrowAmount) external;

  function borrowBalanceCurrent(address _account) external returns (uint256);

  function borrowBalanceStored(address _account)
  external
  view
  returns (uint256);

  function borrowIndex() external view returns (uint256);

  function borrowRatePerBlock() external view returns (uint256);

  function borrowSnapshot(address _account)
  external
  view
  returns (uint256, uint256);

  function controller() external view returns (address);

  function decimals() external view returns (uint8);

  function decreaseAllowance(address spender, uint256 subtractedValue)
  external
  returns (bool);

  function exchangeRateCurrent() external returns (uint256);

  function exchangeRateStored() external view returns (uint256);

  function flashloanFeeRatio() external view returns (uint256);

  function getCash() external view returns (uint256);

  function increaseAllowance(address spender, uint256 addedValue)
  external
  returns (bool);

  function initialize(
    address _underlyingToken,
    string memory _name,
    string memory _symbol,
    address _controller,
    address _interestRateModel
  ) external;

  function interestRateModel() external view returns (address);

  function isSupported() external view returns (bool);

  function isiToken() external pure returns (bool);

  function liquidateBorrow(
    address _borrower,
    uint256 _repayAmount,
    address _assetCollateral
  ) external;

  function mint(address _recipient, uint256 _mintAmount) external;

  function mintForSelfAndEnterMarket(uint256 _mintAmount) external;

  function name() external view returns (string memory);

  function nonces(address) external view returns (uint256);

  function owner() external view returns (address);

  function pendingOwner() external view returns (address);

  function permit(
    address _owner,
    address _spender,
    uint256 _value,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  function protocolFeeRatio() external view returns (uint256);

  function redeem(address _from, uint256 _redeemiToken) external;

  function redeemUnderlying(address _from, uint256 _redeemUnderlying)
  external;

  function repayBorrow(uint256 _repayAmount) external;

  function repayBorrowBehalf(address _borrower, uint256 _repayAmount)
  external;

  function reserveRatio() external view returns (uint256);

  function seize(
    address _liquidator,
    address _borrower,
    uint256 _seizeTokens
  ) external;

  function supplyRatePerBlock() external view returns (uint256);

  function symbol() external view returns (string memory);

  function totalBorrows() external view returns (uint256);

  function totalBorrowsCurrent() external returns (uint256);

  function totalReserves() external view returns (uint256);

  function totalSupply() external view returns (uint256);

  function transfer(address _recipient, uint256 _amount)
  external
  returns (bool);

  function transferFrom(
    address _sender,
    address _recipient,
    uint256 _amount
  ) external returns (bool);

  function underlying() external view returns (address);

  function updateInterest() external returns (bool);
}
