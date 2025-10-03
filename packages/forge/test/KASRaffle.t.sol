// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import { KASRaffle } from "../src/KASRaffle.sol";

contract KASRaffleTest is Test {
    KASRaffle internal raffle;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xA110);
    address internal bob = address(0xB0B0);
    address internal carol = address(0xC0C0);
    address internal keeper = address(0xD00D);

    uint internal constant TICKET_PRICE = 0.1 ether;
    uint internal constant ROUND_DURATION = 3 hours;

    function setUp() public {
        vm.label(admin, "admin");
        vm.label(alice, "alice");
        vm.label(bob, "bob");
        vm.label(carol, "carol");
        vm.label(keeper, "keeper");

        vm.prank(admin);
        raffle = new KASRaffle(TICKET_PRICE, ROUND_DURATION, admin);
        vm.deal(admin, 100 ether);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(keeper, 100 ether);
    }

    function _warpPastDeadline() internal {
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        require(roundInfo.endTime != 0, "countdown not started");
        vm.warp(uint(roundInfo.endTime) + 1);
    }

    function _defaultSeed() internal {
        vm.prevrandao(bytes32(uint(keccak256(abi.encodePacked(block.timestamp, block.number)))));
    }

    function testInitialRoundConfiguration() public {
        assertEq(raffle.ticketPrice(), TICKET_PRICE);
        assertEq(raffle.roundDuration(), ROUND_DURATION);
        assertEq(raffle.rolloverBank(), 0);
        assertEq(raffle.feesAccrued(), 0);

        uint roundId = raffle.currentRoundId();
        assertEq(roundId, 1);
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        assertEq(roundInfo.id, 1);
        assertEq(uint8(roundInfo.status), uint8(KASRaffle.RoundStatus.Open));
        assertEq(roundInfo.totalTickets, 0);
        assertEq(roundInfo.ticketPot, 0);
        assertEq(roundInfo.endTime, 0);
    }

    function testBuyTicketsStartsCountdownAndTracksParticipant() public {
        vm.warp(100);
        uint contractBalanceBefore = address(raffle).balance;

        vm.prank(alice);
        raffle.buyTickets{ value: 0.35 ether }(); // 3 tickets, 0.05 refund

        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        assertEq(roundInfo.totalTickets, 3);
        assertEq(roundInfo.ticketPot, 0.3 ether);
        assertEq(roundInfo.startTime, 100);
        assertEq(roundInfo.endTime, 100 + ROUND_DURATION);
        assertEq(address(raffle).balance, contractBalanceBefore + 0.3 ether);

        KASRaffle.Participant[] memory slice = raffle.getParticipantsSlice(1, 0, 10);
        assertEq(slice.length, 1);
        assertEq(slice[0].account, alice);
        assertEq(slice[0].tickets, 3);

        vm.prank(alice);
        raffle.buyTickets{ value: 0.2 ether }(); // +2 tickets
        roundInfo = raffle.getCurrentRound();
        assertEq(roundInfo.totalTickets, 5);
        assertEq(roundInfo.ticketPot, 0.5 ether);
    }

    function testReceiveHandlesDirectTicketPurchase() public {
        vm.warp(500);
        vm.prank(alice);
        (bool sent,) = address(raffle).call{ value: 0.25 ether }("");
        assertTrue(sent);

        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        assertEq(roundInfo.totalTickets, 2);
        assertEq(roundInfo.ticketPot, 0.2 ether);
    }

    function testCapsEnforcedForParticipantsAndTickets() public {
        uint16[] memory tiers = new uint16[](3);
        tiers[0] = 6000;
        tiers[1] = 2500;
        tiers[2] = 1500;

        vm.prank(admin);
        raffle.setParams({
            _ticketPrice: TICKET_PRICE,
            _roundDuration: ROUND_DURATION,
            _minTicketsToDraw: 2,
            _maxParticipants: 3,
            _maxTicketsPerAddress: 4,
            _maxTicketsPerRound: 6,
            _winnersBps: raffle.winnersBps(),
            _feeBps: raffle.feeBps(),
            _rolloverBps: raffle.rolloverBps(),
            _keeperTipWei: raffle.keeperTipWei(),
            _keeperTipMaxWei: raffle.keeperTipMaxWei(),
            _tierBps: tiers
        });

        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE * raffle.maxTicketsPerAddress() }();

        vm.prank(alice);
        vm.expectRevert(KASRaffle.ErrCapExceeded.selector);
        raffle.buyTickets{ value: TICKET_PRICE }();

        // Fill the round to the cap then expect revert on next purchase
        uint remainingTickets = uint(raffle.maxTicketsPerRound()) - raffle.getCurrentRound().totalTickets;
        vm.prank(bob);
        raffle.buyTickets{ value: remainingTickets * TICKET_PRICE }();

        vm.prank(carol);
        vm.expectRevert(KASRaffle.ErrCapExceeded.selector);
        raffle.buyTickets{ value: TICKET_PRICE }();
    }

    function testCloseRoundRefundPath() public {
        vm.warp(1000);
        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE }();
        _warpPastDeadline();

        vm.prank(keeper);
        raffle.closeRound();

        KASRaffle.Round memory roundInfo = raffle.getRoundSummary(1);
        assertEq(uint8(roundInfo.status), uint8(KASRaffle.RoundStatus.Refunding));
        assertEq(roundInfo.ticketPot, TICKET_PRICE);

        vm.prank(keeper);
        bool finished = raffle.finalizeRefunds(1, 10);
        assertTrue(finished);

        roundInfo = raffle.getRoundSummary(1);
        assertEq(uint8(roundInfo.status), uint8(KASRaffle.RoundStatus.Closed));
        assertEq(roundInfo.ticketPot, 0);
        assertEq(raffle.currentRoundId(), 2);
        assertEq(address(raffle).balance, raffle.rolloverBank() + raffle.feesAccrued() + raffle.unclaimedPrizesTotal());
    }

    function testCloseFinalizeAndClaimHappyPath() public {
        vm.warp(2000);
        vm.prank(alice);
        raffle.buyTickets{ value: 0.4 ether }(); // 4 tickets
        vm.prank(bob);
        raffle.buyTickets{ value: 0.3 ether }(); // 3 tickets
        vm.prank(carol);
        raffle.buyTickets{ value: 0.2 ether }(); // 2 tickets

        uint roundId = raffle.currentRoundId();
        _warpPastDeadline();
        _defaultSeed();

        vm.prank(keeper);
        raffle.closeRound();

        KASRaffle.Round memory roundInfo = raffle.getRoundSummary(roundId);
        assertEq(uint8(roundInfo.status), uint8(KASRaffle.RoundStatus.Drawing));
        assertEq(roundInfo.pot, 0.9 ether);
        assertEq(roundInfo.winnersShare, 0.72 ether);
        assertEq(roundInfo.feeShare, 0.045 ether);
        assertEq(roundInfo.rolloverShare, 0.135 ether);

        vm.prank(keeper);
        bool done = raffle.finalizeRound(5);
        assertTrue(done);

        assertEq(raffle.rolloverBank(), 0.135 ether);
        assertEq(raffle.feesAccrued(), 0.045 ether - raffle.keeperTipWei());
        assertEq(raffle.unclaimedPrizesTotal(), 0.72 ether);
        assertEq(raffle.currentRoundId(), roundId + 1);

        (address[] memory winners, uint[] memory prizes) = raffle.getWinners(roundId);
        uint tierCount = raffle.tierBpsLength();
        assertEq(winners.length, tierCount);
        assertEq(prizes.length, tierCount);

        for (uint i = 0; i < winners.length; i++) {
            vm.deal(winners[i], 5 ether);
            uint contractBalanceBefore = address(raffle).balance;
            vm.prank(winners[i]);
            raffle.claim(roundId);
            assertEq(raffle.claimed(roundId, winners[i]), true);
            assertEq(raffle.claimable(roundId, winners[i]), 0);
            assertEq(address(raffle).balance, contractBalanceBefore - prizes[i]);
        }

        assertEq(raffle.unclaimedPrizesTotal(), 0);

        vm.prank(alice);
        vm.expectRevert(KASRaffle.ErrNothingToClaim.selector);
        raffle.claim(roundId);
    }

    function testFinalizeRoundRequiresDrawingState() public {
        vm.expectRevert(KASRaffle.ErrRoundNotDrawing.selector);
        raffle.finalizeRound(5);
    }

    function testCloseRoundRequiresDeadline() public {
        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE }();
        vm.expectRevert(KASRaffle.ErrRoundNotReady.selector);
        raffle.closeRound();
    }

    function testSetParamsUpdatesConfiguration() public {
        uint16[] memory tiers = new uint16[](3);
        tiers[0] = 5000;
        tiers[1] = 3000;
        tiers[2] = 2000;

        vm.prank(admin);
        raffle.setParams({
            _ticketPrice: 0.2 ether,
            _roundDuration: 6 hours,
            _minTicketsToDraw: 5,
            _maxParticipants: 10_000,
            _maxTicketsPerAddress: 100,
            _maxTicketsPerRound: 300,
            _winnersBps: 7500,
            _feeBps: 1000,
            _rolloverBps: 1500,
            _keeperTipWei: 0.0005 ether,
            _keeperTipMaxWei: 0.005 ether,
            _tierBps: tiers
        });

        assertEq(raffle.ticketPrice(), 0.2 ether);
        assertEq(raffle.roundDuration(), 6 hours);
        assertEq(raffle.minTicketsToDraw(), 5);
        assertEq(raffle.maxParticipants(), 10_000);
        assertEq(raffle.maxTicketsPerAddress(), 100);
        assertEq(raffle.maxTicketsPerRound(), 300);
        assertEq(raffle.winnersBps(), 7500);
        assertEq(raffle.feeBps(), 1000);
        assertEq(raffle.rolloverBps(), 1500);
        assertEq(raffle.keeperTipWei(), 0.0005 ether);
        assertEq(raffle.keeperTipMaxWei(), 0.005 ether);
        assertEq(raffle.tierBps(0), 5000);
        assertEq(raffle.tierBps(1), 3000);
        assertEq(raffle.tierBps(2), 2000);
    }

    function testSetParamsRevertsOnInvalidConfig() public {
        uint16[] memory tiers = new uint16[](2);
        tiers[0] = 6000;
        tiers[1] = 2500; // sums to 8,500

        vm.prank(admin);
        vm.expectRevert(KASRaffle.ErrInvalidParams.selector);
        raffle.setParams({
            _ticketPrice: 1,
            _roundDuration: 5 minutes,
            _minTicketsToDraw: 1,
            _maxParticipants: 10,
            _maxTicketsPerAddress: 10,
            _maxTicketsPerRound: 20,
            _winnersBps: 8000,
            _feeBps: 500,
            _rolloverBps: 1500,
            _keeperTipWei: 1,
            _keeperTipMaxWei: 0,
            _tierBps: tiers
        });
    }

    function testWithdrawFeesTransfersToVault() public {
        vm.warp(4000);
        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE * 10 }();
        _warpPastDeadline();
        _defaultSeed();
        vm.prank(keeper);
        raffle.closeRound();
        vm.prank(keeper);
        raffle.finalizeRound(20);

        uint accrued = raffle.feesAccrued();
        uint contractBalanceBefore = address(raffle).balance;
        vm.prank(admin);
        raffle.withdrawFees(accrued);
        assertEq(raffle.feesAccrued(), 0);
        assertEq(address(raffle).balance, contractBalanceBefore - accrued);
    }

    function testSweepExcessGuardsLiabilities() public {
        vm.warp(5000);
        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE * 5 }();
        vm.expectRevert(KASRaffle.ErrInvalidParams.selector);
        vm.prank(admin);
        raffle.sweepExcess(admin, 1 ether);
    }

    function testPausePreventsTicketPurchase() public {
        vm.prank(admin);
        raffle.pause();

        vm.prank(alice);
        vm.expectRevert();
        raffle.buyTickets{ value: TICKET_PRICE }();

        vm.prank(admin);
        raffle.unpause();
        vm.prank(alice);
        raffle.buyTickets{ value: TICKET_PRICE }();
    }
}

// -----------------------------------------------------------------------------
// Invariants
// -----------------------------------------------------------------------------

contract KASRaffleInvariant is StdInvariant {
    KASRaffle internal raffle;

    address internal admin = address(0xAA11);
    address[3] internal players = [address(0xB001), address(0xB002), address(0xB003)];

    function setUp() public {
        vm.label(admin, "admin");
        for (uint i = 0; i < players.length; i++) {
            vm.label(players[i], string(abi.encodePacked("player", vm.toString(i))));
            vm.deal(players[i], 1000 ether);
        }

        vm.prank(admin);
        raffle = new KASRaffle(0.05 ether, 1 hours, admin);

        targetContract(address(this));
    }

    function buy(uint seed) external {
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Open)) return;
        address player = players[seed % players.length];
        vm.startPrank(player);
        raffle.buyTickets{ value: raffle.ticketPrice() }();
        vm.stopPrank();
    }

    function closeRound() external {
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Open)) return;
        if (roundInfo.endTime == 0) return;
        vm.warp(uint(roundInfo.endTime) + 1);
        vm.prevrandao(bytes32(uint(keccak256(abi.encodePacked(block.timestamp, roundInfo.totalTickets)))));
        raffle.closeRound();
    }

    function finalize(uint steps) external {
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Drawing)) return;
        steps = bound(steps, 1, 10);
        raffle.finalizeRound(steps);
    }

    function processRefunds(uint steps) external {
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Refunding)) return;
        steps = bound(steps, 1, 10);
        raffle.finalizeRefunds(raffle.currentRoundId(), steps);
    }

    function claim(uint seed) external {
        uint currentId = raffle.currentRoundId();
        if (currentId <= 1) return; // nothing closed yet
        uint roundId = currentId - 1;
        KASRaffle.Round memory roundInfo = raffle.getRoundSummary(roundId);
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Closed)) return;

        (address[] memory winners,) = raffle.getWinners(roundId);
        if (winners.length == 0) return;
        address winner = winners[seed % winners.length];
        if (raffle.claimed(roundId, winner)) return;
        vm.deal(winner, 100 ether);
        vm.prank(winner);
        raffle.claim(roundId);
    }

    function invariant_accountingIsBoundedByBalance() public view {
        uint liabilities = raffle.feesAccrued() + raffle.rolloverBank() + raffle.unclaimedPrizesTotal();
        KASRaffle.Round memory roundInfo = raffle.getCurrentRound();
        if (uint8(roundInfo.status) != uint8(KASRaffle.RoundStatus.Closed)) {
            liabilities += roundInfo.ticketPot;
        }
        assertGe(address(raffle).balance, liabilities);
    }
}
