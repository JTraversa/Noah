// Noah V1 Contract Configuration
// Deployed via CREATE2 with salt 0x4e6f6168 ("Noah")

export const NOAH_ADDRESS = '0xB7b9e0ba2B9748e7B5770AB165D142100DD6e4E3';

export const NOAH_ABI = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'buildArk',
    inputs: [
      { name: '_beneficiary', type: 'address' },
      { name: '_deadlineDuration', type: 'uint256' },
      { name: '_tokens', type: 'address[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'pingArk',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getArk',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'deadlineDuration', type: 'uint256' },
      { name: 'tokens', type: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'addPassengers',
    inputs: [{ name: '_newPassengers', type: 'address[]' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removePassenger',
    inputs: [{ name: '_passengerToRemove', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateDeadlineDuration',
    inputs: [{ name: '_newDuration', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'flood',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'destroyArk',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ArkBuilt',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'beneficiary', type: 'address', indexed: true },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ArkPinged',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'newDeadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FloodTriggered',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'beneficiary', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PassengersAdded',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'newPassengers', type: 'address[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PassengerRemoved',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'passenger', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DeadlineUpdated',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'newDuration', type: 'uint256', indexed: false },
      { name: 'newDeadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ArkDestroyed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
    ],
  },
];

// Mock USDC for local testing
export const MOCK_USDC_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
];
