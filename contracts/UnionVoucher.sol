//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMarketRegistry.sol";
import "./interfaces/IUserManager.sol";
import "./BaseUnionMember.sol";

/**
 * @title UnionVoucher Contract
 * @dev This contract has all the functions of Union voucher role.
 */
abstract contract UnionVoucher is BaseUnionMember {
    function getVoucheeCount() public view returns (uint256) {
        return userManager.getVoucheeCount(address(this));
    }

    function getTotalLockedStake() public view returns (uint256) {
        return userManager.getTotalLockedStake(address(this));
    }

    function getLockedStake(address borrower) public view returns (uint256) {
        return userManager.getLockedStake(address(this), borrower);
    }

    /**
     *  @dev Get user's staking amount
     *  @return Staking amount (in wei)
     */
    function getStakerBalance() public view returns (uint256) {
        return userManager.getStakerBalance(address(this));
    }

    /**
     *  @dev Set the vouching amount for another user
     *  @param account Recipient address
     *  @param amount Amount to vouch for (in wei)
     */
    function _updateTrust(address account, uint96 amount) internal {
        userManager.updateTrust(account, amount);
    }

    /**
     *  @dev Stop vouching for another one
     *  @param staker Voucher's address
     *  @param borrower Recipient address
     */
    function _cancelVouch(address staker, address borrower) internal {
        userManager.cancelVouch(staker, borrower);
    }

    /**
     *  @dev Deposit to Union
     *  @param amount Amount to stake (in wei)
     */
    function _stake(uint96 amount) internal {
        underlyingToken.approve(address(userManager), amount);
        userManager.stake(amount);
    }

    /**
     *  @dev Withdraw from Union
     *  @param amount Amount to unstake (in wei)
     */
    function _unstake(uint96 amount) internal {
        userManager.unstake(amount);
    }

    /**
     *  @dev Claim the rewarded UNION tokens
     */
    function _withdrawRewards() internal {
        userManager.withdrawRewards();
    }

    /**
     *  @dev Write off voucher's bad debt
     *  @param borrower Borrower's address
     *  @param amount Amount of debt to write off (in wei)
     */
    function _debtWriteOff(address borrower, uint256 amount) internal {
        userManager.debtWriteOff(address(this), borrower, amount);
    }
}
