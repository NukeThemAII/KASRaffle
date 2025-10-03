// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import { KASRaffle } from "../src/KASRaffle.sol";

contract DeployKASRaffle is Script {
    function run() external returns (KASRaffle deployed) {
        uint deployerKey = vm.envUint("PRIVATE_KEY");
        address feeVault = vm.envAddress("FEE_VAULT");
        uint ticketPrice = vm.envUint("TICKET_PRICE_WEI");
        uint roundDuration = vm.envUint("ROUND_DURATION_SEC");

        vm.startBroadcast(deployerKey);
        deployed = new KASRaffle(ticketPrice, roundDuration, feeVault);
        vm.stopBroadcast();

        console2.log("KASRaffle deployed", address(deployed));
    }
}
