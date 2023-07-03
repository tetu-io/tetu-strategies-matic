// SPDX-License-Identifier: ISC
/**
* By using this software, you understand, acknowledge and accept that Tetu
* and/or the underlying software are provided “as is” and “as available”
* basis and without warranties or representations of any kind either expressed
* or implied. Any use of this open source software released under the ISC
* Internet Systems Consortium license is done at your own risk to the fullest
* extent permissible pursuant to applicable law any and all liability as well
* as all warranties, including any fitness for a particular purpose with respect
* to Tetu and/or the underlying software and the use thereof are disclaimed.
*/

pragma solidity 0.8.4;

import "@tetu_io/tetu-contracts/contracts/base/governance/ControllableV2.sol";
import "@tetu_io/tetu-contracts/contracts/openzeppelin/SafeERC20.sol";
import "../../third_party/balancer/IBalancerGauge.sol";
import "../../third_party/balancer/IBalancerMinter.sol";
import "./IGaugeDepositor.sol";

/// @title Boost power holder.
///        Allowed users can make liquidity deposits to Balancer gauges through this contract to get a boost.
/// @author a17
contract GaugeDepositor is ControllableV2, IGaugeDepositor {
    using SafeERC20 for IERC20;

    string public constant GAUGE_DEPOSITOR_VERSION = "1.0.0";
    address private constant BAL_TOKEN = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;

    // user (strategy) -> gauge -> amount
    mapping(address => mapping(address => uint)) internal _balanceInGauge;

    function initialize(address controller_) external initializer {
        initializeControllable(controller_);
    }

    modifier onlyAllowedUser() {
        require(IController(_controller()).isValidStrategy(msg.sender), "GD: denied");
        _;
    }

    function deposit(address token, uint amount, address gauge) external override onlyAllowedUser {
        uint balance = _balanceInGauge[msg.sender][gauge];
        // only 1 user can use the gauge
        require(IBalancerGauge(gauge).balanceOf(address(this)) == balance, "GD: deposit denied");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _approveIfNeeds(token, amount, gauge);
        IBalancerGauge(gauge).deposit(amount);
        _balanceInGauge[msg.sender][gauge] = balance + amount;
    }

    function withdraw(uint amount, address gauge) external override onlyAllowedUser {
        uint balance = _balanceInGauge[msg.sender][gauge];
        // the user can withdraw only from the gauge in which he made deposits
        require(IBalancerGauge(gauge).balanceOf(address(this)) == balance, "GD: withdrawal denied");
        require(amount <= balance, "GD: insufficient balance");
        IBalancerGauge(gauge).withdraw(amount, msg.sender);
        _balanceInGauge[msg.sender][gauge] = balance - amount;
    }

    function claimRewards(address[] memory tokens, address gauge) external override onlyAllowedUser {
        // the user can claim rewards only from the gauge in which he made deposits
        require(IBalancerGauge(gauge).balanceOf(address(this)) == _balanceInGauge[msg.sender][gauge], "GD: claiming reward denied");
        IBalancerGauge(gauge).claim_rewards();
        IBalancerMinter(IBalancerGauge(gauge).bal_pseudo_minter()).mint(gauge);
        uint len = tokens.length;
        for (uint i; i < len; ++i) {
            uint b = IERC20(tokens[i]).balanceOf(address(this));
            if (b > 0) {
                IERC20(tokens[i]).safeTransfer(msg.sender, b);
            }
        }
    }

    function getBalance(address user, address gauge) external view override returns (uint) {
        return _balanceInGauge[user][gauge];
    }

    function _approveIfNeeds(address token, uint amount, address spender) internal {
        if (IERC20(token).allowance(address(this), spender) < amount) {
            IERC20(token).safeApprove(spender, 0);
            IERC20(token).safeApprove(spender, type(uint).max);
        }
    }
}
