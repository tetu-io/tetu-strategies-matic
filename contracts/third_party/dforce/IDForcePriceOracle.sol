// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

interface IDForcePriceOracle {
  event CappedPricePosted(
    address asset,
    uint256 requestedPriceMantissa,
    uint256 anchorPriceMantissa,
    uint256 cappedPriceMantissa
  );
  event Failure(uint256 error, uint256 info, uint256 detail);
  event NewAnchorAdmin(address oldAnchorAdmin, address newAnchorAdmin);
  event NewPendingAnchor(
    address anchorAdmin,
    address asset,
    uint256 oldScaledPrice,
    uint256 newScaledPrice
  );
  event NewPendingAnchorAdmin(
    address oldPendingAnchorAdmin,
    address newPendingAnchorAdmin
  );
  event NewPoster(address oldPoster, address newPoster);
  event OracleFailure(
    address msgSender,
    address asset,
    uint256 error,
    uint256 info,
    uint256 detail
  );
  event PricePosted(
    address asset,
    uint256 previousPriceMantissa,
    uint256 requestedPriceMantissa,
    uint256 newPriceMantissa
  );
  event ReaderPosted(
    address asset,
    address oldReader,
    address newReader,
    int256 decimalsDifference
  );
  event SetAssetAggregator(address asset, address aggregator);
  event SetAssetStatusOracle(address asset, address statusOracle);
  event SetExchangeRate(
    address asset,
    address exchangeRateModel,
    uint256 exchangeRate,
    uint256 maxSwingRate,
    uint256 maxSwingDuration
  );
  event SetMaxSwing(uint256 maxSwing);
  event SetMaxSwingForAsset(address asset, uint256 maxSwing);
  event SetMaxSwingRate(
    address asset,
    uint256 oldMaxSwingRate,
    uint256 newMaxSwingRate,
    uint256 maxSwingDuration
  );
  event SetPaused(bool newState);

  function MAXIMUM_SWING() external view returns (uint256);

  function MINIMUM_SWING() external view returns (uint256);

  function SECONDS_PER_WEEK() external view returns (uint256);

  function _acceptAnchorAdmin() external returns (uint256);

  function _assetPrices(address) external view returns (uint256 mantissa);

  function _disableAssetAggregator(address _asset) external returns (uint256);

  function _disableAssetAggregatorBatch(address[] memory _assets) external;

  function _disableAssetStatusOracle(address _asset)
  external
  returns (uint256);

  function _disableAssetStatusOracleBatch(address[] memory _assets) external;

  function _disableExchangeRate(address _asset) external returns (uint256);

  function _setAssetAggregator(address _asset, address _aggregator)
  external
  returns (uint256);

  function _setAssetAggregatorBatch(
    address[] memory _assets,
    address[] memory _aggregators
  ) external;

  function _setAssetStatusOracle(address _asset, address _statusOracle)
  external
  returns (uint256);

  function _setAssetStatusOracleBatch(
    address[] memory _assets,
    address[] memory _statusOracles
  ) external;

  function _setMaxSwing(uint256 _maxSwing) external returns (uint256);

  function _setMaxSwingForAsset(address _asset, uint256 _maxSwing)
  external
  returns (uint256);

  function _setMaxSwingForAssetBatch(
    address[] memory _assets,
    uint256[] memory _maxSwings
  ) external;

  function _setPaused(bool _requestedState) external returns (uint256);

  function _setPendingAnchor(address _asset, uint256 _newScaledPrice)
  external
  returns (uint256);

  function _setPendingAnchorAdmin(address _newPendingAnchorAdmin)
  external
  returns (uint256);

  function _setPoster(address _newPoster) external returns (uint256);

  function aggregator(address) external view returns (address);

  function anchorAdmin() external view returns (address);

  function anchors(address)
  external
  view
  returns (uint256 period, uint256 priceMantissa);

  function exchangeRates(address)
  external
  view
  returns (
    address exchangeRateModel,
    uint256 exchangeRate,
    uint256 maxSwingRate,
    uint256 maxSwingDuration
  );

  function getAssetAggregatorPrice(address _asset)
  external
  view
  returns (uint256);

  function getAssetPrice(address _asset) external view returns (uint256);

  function getAssetPriceStatus(address _asset) external view returns (bool);

  function getExchangeRateInfo(address _asset, uint256 _interval)
  external
  view
  returns (
    uint256,
    address,
    address,
    uint256,
    uint256,
    uint256
  );

  function getReaderPrice(address _asset) external view returns (uint256);

  function getUnderlyingPrice(address _asset) external view returns (uint256);

  function getUnderlyingPriceAndStatus(address _asset)
  external
  view
  returns (uint256, bool);

  function maxSwing() external view returns (uint256 mantissa);

  function maxSwingMantissa() external view returns (uint256);

  function maxSwings(address) external view returns (uint256 mantissa);

  function numBlocksPerPeriod() external view returns (uint256);

  function paused() external view returns (bool);

  function pendingAnchorAdmin() external view returns (address);

  function pendingAnchors(address) external view returns (uint256);

  function poster() external view returns (address);

  function readers(address)
  external
  view
  returns (address asset, int256 decimalsDifference);

  function setExchangeRate(
    address _asset,
    address _exchangeRateModel,
    uint256 _maxSwingDuration
  ) external returns (uint256);

  function setMaxSwingRate(address _asset, uint256 _maxSwingDuration)
  external
  returns (uint256);

  function setPrice(address _asset, uint256 _requestedPriceMantissa)
  external
  returns (uint256);

  function setPrices(
    address[] memory _assets,
    uint256[] memory _requestedPriceMantissas
  ) external returns (uint256[] memory);

  function setReaders(address _asset, address _readAsset)
  external
  returns (uint256);

  function statusOracle(address) external view returns (address);

  receive() external payable;
}
