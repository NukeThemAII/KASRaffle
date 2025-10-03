// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "./Test.sol";

abstract contract StdInvariant is Test {
    function targetContract(address addr) internal virtual {
        vm.targetContract(addr);
    }
}
