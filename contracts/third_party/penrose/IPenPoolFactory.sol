// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IPenPoolFactory {
    function penPoolsLength() external view returns (uint256);

    function isPenPool(address) external view returns (bool);

    function isPenPoolOrLegacyPenPool(address) external view returns (bool);

    function PEN() external view returns (address);

    function syncPools(uint256) external;

    function penPools(uint256) external view returns (address);

    function penPoolByDystPool(address) external view returns (address);

    function vlPenAddress() external view returns (address);

    function dystPoolByPenPool(address) external view returns (address);

    function syncedPoolsLength() external returns (uint256);

    function dystopiaLensAddress() external view returns (address);

    function voterProxyAddress() external view returns (address);

    function rewardsDistributorAddress() external view returns (address);

    function tokensAllowlist() external view returns (address);
}
