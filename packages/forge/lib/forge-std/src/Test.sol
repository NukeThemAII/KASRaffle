// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Vm, VmSafe} from "./Vm.sol";

abstract contract Test {
    Vm public constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    VmSafe public constant vmSafe = VmSafe(address(vm));

    function assertTrue(bool condition) internal pure {
        require(condition, "assertTrue failed");
    }

    function assertEq(uint256 left, uint256 right) internal pure {
        require(left == right, "assertEq(uint256) failed");
    }

    function assertEq(uint256 left, uint256 right, string memory) internal pure {
        assertEq(left, right);
    }

    function assertEq(address left, address right) internal pure {
        require(left == right, "assertEq(address) failed");
    }

    function assertEq(address left, address right, string memory) internal pure {
        assertEq(left, right);
    }

    function assertEq(bool left, bool right) internal pure {
        require(left == right, "assertEq(bool) failed");
    }

    function assertEq(bool left, bool right, string memory) internal pure {
        assertEq(left, right);
    }

    function assertGe(uint256 left, uint256 right) internal pure {
        require(left >= right, "assertGe(uint256) failed");
    }

    function assertGe(uint256 left, uint256 right, string memory) internal pure {
        assertGe(left, right);
    }

    function bound(uint256 x, uint256 minValue, uint256 maxValue) internal pure returns (uint256 result) {
        require(minValue <= maxValue, "bound range");
        if (x < minValue) {
            return minValue;
        }
        if (x > maxValue) {
            if (maxValue == type(uint256).max) {
                return maxValue;
            }
            uint256 span = maxValue - minValue + 1;
            return minValue + (x - minValue) % span;
        }
        return x;
    }
}
