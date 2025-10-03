import type { Abi } from "viem";

export const kasRaffleAbi = [
  {
    "type": "function",
    "stateMutability": "payable",
    "name": "buyTickets",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "name": "closeRound",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "name": "finalizeRound",
    "inputs": [{ "name": "maxSteps", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "done", "type": "bool", "internalType": "bool" }]
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "name": "finalizeRefunds",
    "inputs": [
      { "name": "roundId", "type": "uint256", "internalType": "uint256" },
      { "name": "maxSteps", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "done", "type": "bool", "internalType": "bool" }]
  },
  {
    "type": "function",
    "stateMutability": "nonpayable",
    "name": "claim",
    "inputs": [{ "name": "roundId", "type": "uint256", "internalType": "uint256" }],
    "outputs": []
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "claimable",
    "inputs": [
      { "name": "roundId", "type": "uint256", "internalType": "uint256" },
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "amount", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "function",
    "name": "getCurrentRound",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint64", "internalType": "uint64" },
          { "name": "startTime", "type": "uint64", "internalType": "uint64" },
          { "name": "endTime", "type": "uint64", "internalType": "uint64" },
          { "name": "status", "type": "uint8", "internalType": "enum KASRaffle.RoundStatus" },
          { "name": "participants", "type": "uint64", "internalType": "uint64" },
          { "name": "totalTickets", "type": "uint128", "internalType": "uint128" },
          { "name": "ticketPot", "type": "uint256", "internalType": "uint256" },
          { "name": "seededRollover", "type": "uint256", "internalType": "uint256" },
          { "name": "pot", "type": "uint256", "internalType": "uint256" },
          { "name": "winnersShare", "type": "uint256", "internalType": "uint256" },
          { "name": "feeShare", "type": "uint256", "internalType": "uint256" },
          { "name": "rolloverShare", "type": "uint256", "internalType": "uint256" },
          { "name": "seed", "type": "bytes32", "internalType": "bytes32" }
        ],
        "internalType": "struct KASRaffle.Round"
      }
    ]
  },
  {
    "type": "function",
    "name": "getRoundSummary",
    "stateMutability": "view",
    "inputs": [{ "name": "roundId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint64", "internalType": "uint64" },
          { "name": "startTime", "type": "uint64", "internalType": "uint64" },
          { "name": "endTime", "type": "uint64", "internalType": "uint64" },
          { "name": "status", "type": "uint8", "internalType": "enum KASRaffle.RoundStatus" },
          { "name": "participants", "type": "uint64", "internalType": "uint64" },
          { "name": "totalTickets", "type": "uint128", "internalType": "uint128" },
          { "name": "ticketPot", "type": "uint256", "internalType": "uint256" },
          { "name": "seededRollover", "type": "uint256", "internalType": "uint256" },
          { "name": "pot", "type": "uint256", "internalType": "uint256" },
          { "name": "winnersShare", "type": "uint256", "internalType": "uint256" },
          { "name": "feeShare", "type": "uint256", "internalType": "uint256" },
          { "name": "rolloverShare", "type": "uint256", "internalType": "uint256" },
          { "name": "seed", "type": "bytes32", "internalType": "bytes32" }
        ],
        "internalType": "struct KASRaffle.Round"
      }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getParticipantsSlice",
    "inputs": [
      { "name": "roundId", "type": "uint256", "internalType": "uint256" },
      { "name": "start", "type": "uint256", "internalType": "uint256" },
      { "name": "limit", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "",
        "components": [
          { "name": "account", "type": "address", "internalType": "address" },
          { "name": "tickets", "type": "uint64", "internalType": "uint64" }
        ],
        "internalType": "struct KASRaffle.Participant[]"
      }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getParticipantsCount",
    "inputs": [{ "name": "roundId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "count", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getTierBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16[]",
        "internalType": "uint16[]"
      }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "tierBpsLength",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "getWinners",
    "inputs": [{ "name": "roundId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "winners", "type": "address[]", "internalType": "address[]" },
      { "name": "prizes", "type": "uint256[]", "internalType": "uint256[]" }
    ]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "winningTicketIndices",
    "inputs": [{ "name": "roundId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "indices", "type": "uint256[]", "internalType": "uint256[]" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "ticketPrice",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "roundDuration",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
  },
  {
    "type": "function",
    "stateMutability": "view",
    "name": "currentRoundId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
  }
] as const satisfies Abi;
