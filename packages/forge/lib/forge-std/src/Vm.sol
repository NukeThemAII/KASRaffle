// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface Vm {
    function warp(uint256) external;
    function prevrandao(bytes32) external;
    function deal(address, uint256) external;
    function label(address, string calldata) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function envUint(string calldata) external returns (uint256);
    function envAddress(string calldata) external returns (address);
    function toString(uint256) external returns (string memory);
    function targetContract(address) external;
}

interface VmSafe {
    function warp(uint256) external;
    function deal(address, uint256) external;
    function label(address, string calldata) external;
}
