//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IOpOwner {
    function admin() external view returns(address);
    function setPendingOwner(address newOwner) external;

    function setPendingAdmin(address newAdmin) external;

    function acceptOwner() external;

    function acceptAdmin() external;

    function execute(address target, uint256 value, bytes calldata data) external payable;
}
