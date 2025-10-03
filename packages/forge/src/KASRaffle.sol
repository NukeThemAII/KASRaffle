// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
import { Pausable } from "openzeppelin-contracts/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import { SafeCast } from "openzeppelin-contracts/contracts/utils/math/SafeCast.sol";

/**
 * @title KASRaffle
 * @notice Ticket-based, time-boxed raffle for the Kasplex (Kaspa L2 EVM) network.
 *         Users purchase tickets in KAS. Once the countdown elapses, the round is closed
 *         and winners are drawn pseudo-randomly via block entropy (prevrandao + blockhash).
 *         Prize pool is split into winner tiers, protocol fees, and a rollover seed for the
 *         subsequent round. Lifecycle is permissionless; distribution is chunked to stay
 *         under gas limits. Winners self-claim; admin can only withdraw accrued fees.
 */
contract KASRaffle is Ownable, Pausable, ReentrancyGuard {
    using SafeCast for uint;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum RoundStatus {
        Open,
        Ready,
        Drawing,
        Refunding,
        Closed
    }

    struct Participant {
        address account;
        uint64 tickets; // bounded by maxTicketsPerAddress
    }

    struct Round {
        uint64 id;
        uint64 startTime; // first ticket timestamp
        uint64 endTime; // startTime + roundDuration once countdown starts
        RoundStatus status;
        uint64 participants; // number of unique participants
        uint128 totalTickets; // total tickets sold in round
        uint ticketPot; // wei contributed by ticket sales (excluding rollover)
        uint seededRollover; // rollover injected from previous round
        uint pot; // ticketPot + seededRollover at lock time
        uint winnersShare; // total allocated to winners (80% default)
        uint feeShare; // total allocated to protocol fees (5% default)
        uint rolloverShare; // reserved for next round (15% default)
        bytes32 seed; // randomness seed captured at close
    }

    // ---------------------------------------------------------------------
    // Storage - participants & winners per round
    // ---------------------------------------------------------------------

    mapping(uint => Participant[]) private _participants; // roundId => participants array
    mapping(uint => mapping(address => uint)) private _participantIndex; // roundId => (account => index+1)

    mapping(uint => address[]) private _winners; // roundId => winner addresses (per tier pick)
    mapping(uint => uint[]) private _prizes; // roundId => prize amounts (aligned with winners array)
    mapping(uint => mapping(address => bool)) public claimed; // roundId => (winner => claimed?)

    mapping(uint => uint[]) private _winningTicketIndices; // roundId => sorted winning indices (1..totalTickets)
    mapping(uint => uint) private _drawCursorParticipant; // roundId => next participant index during finalize
    mapping(uint => uint) private _drawCursorWinner; // roundId => next winner index to resolve
    mapping(uint => uint) private _drawCumulativeTickets; // roundId => tickets counted so far during finalize

    mapping(uint => uint) private _refundCursor; // roundId => next participant index to refund

    // ---------------------------------------------------------------------
    // Config (can be tuned by owner within bounds)
    // ---------------------------------------------------------------------

    uint public ticketPrice; // in wei
    uint public roundDuration; // seconds
    uint64 public minTicketsToDraw; // minimum tickets required to draw winners
    uint64 public maxParticipants; // cap unique participants per round
    uint64 public maxTicketsPerAddress; // per-address ticket cap
    uint128 public maxTicketsPerRound; // overall ticket cap per round

    uint16 public constant DENOM = 10_000;
    uint16 public winnersBps; // share for winners (default 8000)
    uint16 public feeBps; // share for protocol fees (default 500)
    uint16 public rolloverBps; // share rolled over (default 1500)
    uint16[] public tierBps; // tier split of winners share (sums to DENOM)

    uint public keeperTipWei; // nominal keeper tip (paid from fees when available)
    uint public keeperTipMaxWei; // upper bound on keeper tip

    // ---------------------------------------------------------------------
    // Accounting
    // ---------------------------------------------------------------------

    uint public feesAccrued; // withdrawable protocol fees
    uint public rolloverBank; // reserved for seeding the next round
    uint public unclaimedPrizesTotal; // aggregate of outstanding winner claims
    address public feeVault; // recipient for fee withdrawals

    uint public currentRoundId; // identifier of the active round

    mapping(uint => Round) public rounds; // roundId => Round metadata

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RoundOpened(uint indexed roundId, uint startTime, uint endTime, uint seededRollover);
    event TicketsPurchased(uint indexed roundId, address indexed buyer, uint64 tickets, uint value, uint totalTickets);
    event RoundReady(uint indexed roundId, uint pot, uint winnersShare, uint feeShare, uint rolloverShare);
    event DrawingStarted(uint indexed roundId, bytes32 seed, uint[] winningTicketIndices);
    event WinnersResolved(uint indexed roundId, address[] winners, uint[] prizes);
    event RefundsQueued(uint indexed roundId, uint participants);
    event Refunded(uint indexed roundId, address indexed account, uint amount);
    event Claimed(uint indexed roundId, address indexed winner, uint amount);
    event FeesWithdrawn(address indexed to, uint amount);
    event KeeperPaid(address indexed keeper, uint amount);
    event ParamsUpdated();

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ErrInvalidParams();
    error ErrRoundNotOpen();
    error ErrRoundNotReady();
    error ErrRoundNotDrawing();
    error ErrRoundNotRefunding();
    error ErrNothingToClaim();
    error ErrCapExceeded();
    error ErrTransferFailed();

    // ---------------------------------------------------------------------
    // Constructor & initialization
    // ---------------------------------------------------------------------

    constructor(uint _ticketPrice, uint _roundDuration, address _feeVault) Ownable(msg.sender) {
        if (_ticketPrice == 0 || _roundDuration < 5 minutes || _feeVault == address(0)) revert ErrInvalidParams();

        ticketPrice = _ticketPrice;
        roundDuration = _roundDuration;
        minTicketsToDraw = 2;
        maxParticipants = 5000;
        maxTicketsPerAddress = 50_000;
        maxTicketsPerRound = 200_000;

        winnersBps = 8000;
        feeBps = 500;
        rolloverBps = 1500;

        keeperTipWei = 0.001 ether;
        keeperTipMaxWei = 0.01 ether;

        feeVault = _feeVault;

        tierBps.push(6000);
        tierBps.push(2500);
        tierBps.push(1500);

        _openNextRound();
    }

    // ---------------------------------------------------------------------
    // Receive / ticket purchase
    // ---------------------------------------------------------------------

    receive() external payable whenNotPaused nonReentrant {
        _buyTickets(msg.sender, msg.value);
    }

    function buyTickets() external payable whenNotPaused nonReentrant {
        _buyTickets(msg.sender, msg.value);
    }

    function _buyTickets(address buyer, uint value) private {
        Round storage roundInfo = rounds[currentRoundId];
        if (roundInfo.status != RoundStatus.Open) revert ErrRoundNotOpen();
        if (ticketPrice == 0) revert ErrInvalidParams();

        uint tickets = value / ticketPrice;
        if (tickets == 0) {
            if (value > 0) _pay(buyer, value);
            return;
        }

        if (tickets > type(uint64).max) revert ErrCapExceeded();

        uint remainder = value - tickets * ticketPrice;

        // start countdown on first ticket
        if (roundInfo.totalTickets == 0) {
            roundInfo.startTime = uint(block.timestamp).toUint64();
            roundInfo.endTime = uint(block.timestamp + roundDuration).toUint64();
        }

        uint newTotalTickets = uint(roundInfo.totalTickets) + tickets;
        if (newTotalTickets > maxTicketsPerRound) revert ErrCapExceeded();

        uint participantSlot = _participantIndex[currentRoundId][buyer];
        if (participantSlot == 0) {
            if (tickets > maxTicketsPerAddress) revert ErrCapExceeded();
            if (roundInfo.participants >= maxParticipants) revert ErrCapExceeded();
            _participants[currentRoundId].push(Participant({ account: buyer, tickets: tickets.toUint64() }));
            roundInfo.participants = (uint(roundInfo.participants) + 1).toUint64();
            _participantIndex[currentRoundId][buyer] = _participants[currentRoundId].length; // 1-based index
        } else {
            Participant storage p = _participants[currentRoundId][participantSlot - 1];
            uint updatedTickets = uint(p.tickets) + tickets;
            if (updatedTickets > maxTicketsPerAddress) revert ErrCapExceeded();
            p.tickets = updatedTickets.toUint64();
        }

        roundInfo.totalTickets = newTotalTickets.toUint128();
        roundInfo.ticketPot += tickets * ticketPrice;

        emit TicketsPurchased(currentRoundId, buyer, tickets.toUint64(), tickets * ticketPrice, newTotalTickets);

        if (remainder > 0) {
            _pay(buyer, remainder);
        }
    }

    // ---------------------------------------------------------------------
    // Lifecycle: close & draw
    // ---------------------------------------------------------------------

    function closeRound() external whenNotPaused nonReentrant {
        Round storage roundInfo = rounds[currentRoundId];
        if (roundInfo.status != RoundStatus.Open) revert ErrRoundNotOpen();
        if (roundInfo.endTime == 0 || block.timestamp < roundInfo.endTime) revert ErrRoundNotReady();

        if (roundInfo.totalTickets < minTicketsToDraw) {
            roundInfo.status = RoundStatus.Refunding;
            emit RefundsQueued(currentRoundId, roundInfo.participants);
            _payKeeper(msg.sender);
            return;
        }

        roundInfo.status = RoundStatus.Ready;

        uint pot = roundInfo.ticketPot + roundInfo.seededRollover;
        roundInfo.pot = pot;
        roundInfo.winnersShare = (pot * winnersBps) / DENOM;
        roundInfo.feeShare = (pot * feeBps) / DENOM;
        roundInfo.rolloverShare = pot - roundInfo.winnersShare - roundInfo.feeShare;

        emit RoundReady(
            currentRoundId, roundInfo.pot, roundInfo.winnersShare, roundInfo.feeShare, roundInfo.rolloverShare
        );

        roundInfo.status = RoundStatus.Drawing;
        roundInfo.seed = _entropySeed(currentRoundId, roundInfo.totalTickets, pot);

        delete _winningTicketIndices[currentRoundId];
        uint tierCount = tierBps.length;
        uint[] memory picks = new uint[](tierCount);
        for (uint i = 0; i < tierCount; i++) {
            picks[i] = (uint(keccak256(abi.encode(roundInfo.seed, i))) % uint(roundInfo.totalTickets)) + 1;
        }
        _sortAscending(picks);
        for (uint i = 0; i < tierCount; i++) {
            _winningTicketIndices[currentRoundId].push(picks[i]);
        }

        _drawCursorParticipant[currentRoundId] = 0;
        _drawCursorWinner[currentRoundId] = 0;
        _drawCumulativeTickets[currentRoundId] = 0;

        emit DrawingStarted(currentRoundId, roundInfo.seed, picks);
        _payKeeper(msg.sender);
    }

    function finalizeRound(uint maxSteps) external whenNotPaused nonReentrant returns (bool done) {
        uint roundId = currentRoundId;
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.status != RoundStatus.Drawing) revert ErrRoundNotDrawing();
        if (maxSteps == 0) return false;

        Participant[] storage participantsArr = _participants[roundId];
        uint[] storage ticketIndices = _winningTicketIndices[roundId];

        uint participantCursor = _drawCursorParticipant[roundId];
        uint winnerCursor = _drawCursorWinner[roundId];
        uint cumulative = _drawCumulativeTickets[roundId];

        uint steps;
        while (participantCursor < participantsArr.length && winnerCursor < ticketIndices.length && steps < maxSteps) {
            Participant storage p = participantsArr[participantCursor];
            if (p.tickets == 0) {
                participantCursor++;
                steps++;
                continue;
            }

            uint nextBoundary = cumulative + uint(p.tickets);
            while (winnerCursor < ticketIndices.length && ticketIndices[winnerCursor] <= nextBoundary) {
                _winners[roundId].push(p.account);
                winnerCursor++;
            }

            cumulative = nextBoundary;
            participantCursor++;
            steps++;
        }

        _drawCursorParticipant[roundId] = participantCursor;
        _drawCursorWinner[roundId] = winnerCursor;
        _drawCumulativeTickets[roundId] = cumulative;

        if (winnerCursor == ticketIndices.length) {
            uint tierCount = tierBps.length;
            uint[] storage prizesArr = _prizes[roundId];
            uint totalPrize;
            for (uint i = 0; i < tierCount; i++) {
                uint prize = (roundInfo.winnersShare * uint(tierBps[i])) / DENOM;
                if (i == tierCount - 1) {
                    prize = roundInfo.winnersShare - totalPrize;
                }
                prizesArr.push(prize);
                totalPrize += prize;
            }

            // accounting updates
            feesAccrued += roundInfo.feeShare;
            rolloverBank = roundInfo.rolloverShare;
            unclaimedPrizesTotal += totalPrize;

            roundInfo.ticketPot = 0;
            roundInfo.status = RoundStatus.Closed;

            emit WinnersResolved(roundId, _winners[roundId], _prizes[roundId]);

            done = true;
            _payKeeper(msg.sender);
            _openNextRound();
        }
    }

    function finalizeRefunds(uint roundId, uint maxSteps) external whenNotPaused nonReentrant returns (bool done) {
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.status != RoundStatus.Refunding) revert ErrRoundNotRefunding();
        if (maxSteps == 0) return false;

        Participant[] storage participantsArr = _participants[roundId];
        uint cursor = _refundCursor[roundId];
        uint steps;

        for (; cursor < participantsArr.length && steps < maxSteps; cursor++) {
            Participant storage p = participantsArr[cursor];
            if (p.tickets == 0) {
                steps++;
                continue;
            }

            uint refundAmount = uint(p.tickets) * ticketPrice;
            p.tickets = 0; // prevent double refunds
            roundInfo.ticketPot -= refundAmount;
            _pay(p.account, refundAmount);
            emit Refunded(roundId, p.account, refundAmount);
            steps++;
        }

        _refundCursor[roundId] = cursor;
        if (cursor == participantsArr.length) {
            roundInfo.ticketPot = 0;
            roundInfo.status = RoundStatus.Closed;
            done = true;
            _payKeeper(msg.sender);

            if (roundId == currentRoundId) {
                _openNextRound();
            }
        }
    }

    // ---------------------------------------------------------------------
    // Claims
    // ---------------------------------------------------------------------

    function claim(uint roundId) external whenNotPaused nonReentrant {
        if (claimed[roundId][msg.sender]) revert ErrNothingToClaim();
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.status != RoundStatus.Closed) revert ErrNothingToClaim();

        address[] storage winnersArr = _winners[roundId];
        uint[] storage prizesArr = _prizes[roundId];

        uint owed;
        for (uint i = 0; i < winnersArr.length; i++) {
            if (winnersArr[i] == msg.sender) {
                owed += prizesArr[i];
            }
        }

        if (owed == 0) revert ErrNothingToClaim();

        claimed[roundId][msg.sender] = true;
        if (owed > unclaimedPrizesTotal) revert ErrInvalidParams();
        unclaimedPrizesTotal -= owed;

        _pay(msg.sender, owed);
        emit Claimed(roundId, msg.sender, owed);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRoundId];
    }

    function getRoundSummary(uint roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getParticipantsCount(uint roundId) external view returns (uint) {
        return _participants[roundId].length;
    }

    function getParticipantsSlice(uint roundId, uint start, uint limit)
        external
        view
        returns (Participant[] memory slice)
    {
        Participant[] storage allParticipants = _participants[roundId];
        uint length = allParticipants.length;
        if (start >= length) return new Participant[](0);

        uint end = start + limit;
        if (end > length) end = length;
        uint size = end - start;
        slice = new Participant[](size);
        for (uint i = 0; i < size; i++) {
            slice[i] = allParticipants[start + i];
        }
    }

    function getWinners(uint roundId) external view returns (address[] memory, uint[] memory) {
        return (_winners[roundId], _prizes[roundId]);
    }

    function winningTicketIndices(uint roundId) external view returns (uint[] memory) {
        return _winningTicketIndices[roundId];
    }

    function claimable(uint roundId, address account) external view returns (uint) {
        if (claimed[roundId][account]) return 0;
        address[] storage winnersArr = _winners[roundId];
        uint[] storage prizesArr = _prizes[roundId];
        uint owed;
        for (uint i = 0; i < winnersArr.length; i++) {
            if (winnersArr[i] == account) {
                owed += prizesArr[i];
            }
        }
        return owed;
    }

    function getTierBps() external view returns (uint16[] memory) {
        uint length = tierBps.length;
        uint16[] memory out = new uint16[](length);
        for (uint i = 0; i < length; i++) {
            out[i] = tierBps[i];
        }
        return out;
    }

    function tierBpsLength() external view returns (uint) {
        return tierBps.length;
    }

    // ---------------------------------------------------------------------
    // Admin controls
    // ---------------------------------------------------------------------

    function setParams(
        uint _ticketPrice,
        uint _roundDuration,
        uint64 _minTicketsToDraw,
        uint64 _maxParticipants,
        uint64 _maxTicketsPerAddress,
        uint128 _maxTicketsPerRound,
        uint16 _winnersBps,
        uint16 _feeBps,
        uint16 _rolloverBps,
        uint _keeperTipWei,
        uint _keeperTipMaxWei,
        uint16[] calldata _tierBps
    ) external onlyOwner {
        if (_ticketPrice == 0 || _roundDuration < 5 minutes) revert ErrInvalidParams();
        if (_maxParticipants == 0 || _maxTicketsPerRound == 0 || _maxTicketsPerAddress == 0) revert ErrInvalidParams();
        if (_maxTicketsPerAddress > _maxTicketsPerRound) revert ErrInvalidParams();
        if (uint(_winnersBps) + _feeBps + _rolloverBps != DENOM) revert ErrInvalidParams();
        if (_keeperTipWei > _keeperTipMaxWei) revert ErrInvalidParams();
        if (_tierBps.length == 0) revert ErrInvalidParams();

        uint tierSum;
        for (uint i = 0; i < _tierBps.length; i++) {
            tierSum += _tierBps[i];
        }
        if (tierSum != DENOM) revert ErrInvalidParams();

        ticketPrice = _ticketPrice;
        roundDuration = _roundDuration;
        minTicketsToDraw = _minTicketsToDraw;
        maxParticipants = _maxParticipants;
        maxTicketsPerAddress = _maxTicketsPerAddress;
        maxTicketsPerRound = _maxTicketsPerRound;
        winnersBps = _winnersBps;
        feeBps = _feeBps;
        rolloverBps = _rolloverBps;
        keeperTipWei = _keeperTipWei;
        keeperTipMaxWei = _keeperTipMaxWei;

        delete tierBps;
        for (uint i = 0; i < _tierBps.length; i++) {
            tierBps.push(_tierBps[i]);
        }

        emit ParamsUpdated();
    }

    function setFeeVault(address _feeVault) external onlyOwner {
        if (_feeVault == address(0)) revert ErrInvalidParams();
        feeVault = _feeVault;
    }

    function withdrawFees(uint amount) external onlyOwner nonReentrant {
        if (amount == 0 || amount > feesAccrued) revert ErrInvalidParams();
        feesAccrued -= amount;
        _pay(feeVault, amount);
        emit FeesWithdrawn(feeVault, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function sweepExcess(address to, uint amount) external onlyOwner nonReentrant {
        if (to == address(0) || amount == 0) revert ErrInvalidParams();
        uint liabilities = _totalLiabilities();
        uint balance = address(this).balance;
        if (balance <= liabilities || amount > balance - liabilities) revert ErrInvalidParams();
        _pay(to, amount);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _openNextRound() internal {
        currentRoundId += 1;
        Round storage roundInfo = rounds[currentRoundId];
        roundInfo.id = currentRoundId.toUint64();
        roundInfo.startTime = 0;
        roundInfo.endTime = 0;
        roundInfo.status = RoundStatus.Open;
        roundInfo.participants = 0;
        roundInfo.totalTickets = 0;
        roundInfo.ticketPot = 0;
        roundInfo.pot = 0;
        roundInfo.winnersShare = 0;
        roundInfo.feeShare = 0;
        roundInfo.rolloverShare = 0;
        roundInfo.seed = bytes32(0);
        roundInfo.seededRollover = rolloverBank;

        delete _winningTicketIndices[currentRoundId];
        delete _drawCursorParticipant[currentRoundId];
        delete _drawCursorWinner[currentRoundId];
        delete _drawCumulativeTickets[currentRoundId];
        delete _refundCursor[currentRoundId];

        emit RoundOpened(currentRoundId, roundInfo.startTime, roundInfo.endTime, roundInfo.seededRollover);
    }

    function _entropySeed(uint roundId, uint128 totalTickets, uint pot) private view returns (bytes32) {
        uint pr;
        assembly {
            pr := prevrandao()
        }
        if (pr == 0) {
            return keccak256(abi.encode(blockhash(block.number - 1), block.timestamp, totalTickets, pot, roundId));
        }
        return keccak256(abi.encode(pr, blockhash(block.number - 1), totalTickets, pot, roundId));
    }

    function _sortAscending(uint[] memory data) private pure {
        uint length = data.length;
        for (uint i = 1; i < length; i++) {
            uint key = data[i];
            uint j = i;
            while (j > 0 && data[j - 1] > key) {
                data[j] = data[j - 1];
                j--;
            }
            data[j] = key;
        }
    }

    function _pay(address to, uint amount) private {
        (bool success,) = to.call{ value: amount }("");
        if (!success) revert ErrTransferFailed();
    }

    function _payKeeper(address keeper) private {
        uint tip = keeperTipWei;
        if (tip > keeperTipMaxWei) tip = keeperTipMaxWei;
        if (tip > feesAccrued) tip = feesAccrued;
        if (tip == 0) return;
        feesAccrued -= tip;
        _pay(keeper, tip);
        emit KeeperPaid(keeper, tip);
    }

    function _totalLiabilities() private view returns (uint) {
        uint liabilities = feesAccrued + rolloverBank + unclaimedPrizesTotal;
        if (currentRoundId != 0) {
            Round storage roundInfo = rounds[currentRoundId];
            if (roundInfo.status != RoundStatus.Closed) {
                liabilities += roundInfo.ticketPot;
            }
        }
        return liabilities;
    }
}
