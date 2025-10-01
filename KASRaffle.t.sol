// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/KASRaffle.sol";

contract KASRaffleTest is Test {
    KASRaffle raffle;
    address admin = address(0xA11CE);
    address alice = address(0xBEEF);
    address bob   = address(0xCAFE);
    address carol = address(0xD00D);

    function setUp() public {
        vm.deal(alice, 100 ether);
        vm.deal(bob,   100 ether);
        vm.deal(carol, 100 ether);
        vm.prank(admin);
        raffle = new KASRaffle(0.1 ether, 3 hours, admin);
    }

    function testBuyAndClose() public {
        vm.prank(alice); raffle.buyTickets{value: 1 ether}(); // 10 tickets
        vm.prank(bob);   raffle.buyTickets{value: 2 ether}(); // 20 tickets

        // fast-forward
        (, , , , , , , , ,) = (1,1,1,1,1,1,1,1,1,1); // silence
        vm.warp(block.timestamp + 3 hours + 1);
        raffle.closeRound();

        // finalize in chunks
        bool done = false;
        while (!done) {
            done = raffle.finalizeRound(1000);
        }

        // winners & claim
        (address[] memory ws, uint256[] memory ps) = raffle.getWinners(1);
        assertEq(ws.length, ps.length);
        // allow winners to claim, etc.
    }

    function testRefundPathWhenNotEnoughTickets() public {
        vm.prank(alice); raffle.buyTickets{value: 0.1 ether}();
        vm.warp(block.timestamp + 3 hours + 1);
        raffle.closeRound();
        bool done = false;
        while (!done) {
            done = raffle.finalizeRefunds(1, 1000);
        }
    }
}
