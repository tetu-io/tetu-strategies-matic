// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IOvixChainLinkOracleV2 {
    function admin() external view returns(address);
    function setHeartbeat(address oToken, uint heartbeat) external;
}