export const contract = {
  name: 'Noah',
  file: 'noah.sol',
  description: 'A dead man\'s switch contract to transfer a user\'s tokens to a beneficiary after a set time.',
  struct: {
    name: 'Ark',
    description: 'The Ark struct represents a user\'s dead man\'s switch configuration.',
    fields: [
      { name: 'beneficiary', type: 'address', desc: 'The address that will receive the tokens when the flood is triggered.' },
      { name: 'deadline', type: 'uint256', desc: 'The Unix timestamp after which the Ark can be flooded.' },
      { name: 'deadlineDuration', type: 'uint256', desc: 'The duration in seconds used to calculate new deadlines on ping.' },
      { name: 'tokens', type: 'address[]', desc: 'The array of ERC20 token addresses managed by this Ark.' },
    ]
  },
  mapping: {
    name: 'arks',
    signature: 'mapping(address => Ark)',
    desc: 'Mapping from user address to their Ark configuration. Each user can only have one Ark at a time. A deadline of 0 indicates no active Ark.'
  },
  functions: [
    {
      name: 'buildArk',
      desc: 'Builds an Ark for the caller. Sets beneficiary, deadline duration, and tokens to manage.',
      params: [
        { name: '_beneficiary', type: 'address', desc: 'The address to receive the funds.' },
        { name: '_deadlineDuration', type: 'uint256', desc: 'The time in seconds to wait before the Ark can be triggered.' },
        { name: '_tokens', type: 'address[]', desc: 'The list of token addresses to be managed.' },
      ]
    },
    {
      name: 'pingArk',
      desc: 'Pings an Ark to reset its timer, extending the deadline.',
      params: []
    },
    {
      name: 'flood',
      desc: 'Triggers flood process for a user, transferring their tokens to beneficiary. Only callable after deadline.',
      params: [
        { name: '_user', type: 'address', desc: 'The address of the user whose assets are being recovered.' },
      ]
    },
    {
      name: 'addPassengers',
      desc: 'Adds new passengers (tokens) to a user\'s Ark.',
      params: [
        { name: '_newPassengers', type: 'address[]', desc: 'The list of new token addresses to add.' },
      ]
    },
    {
      name: 'removePassenger',
      desc: 'Removes a passenger (token) from a user\'s Ark.',
      params: [
        { name: '_passengerToRemove', type: 'address', desc: 'The address of the token to remove.' },
      ]
    },
    {
      name: 'updateDeadlineDuration',
      desc: 'Updates the deadline duration for future resets.',
      params: [
        { name: '_newDuration', type: 'uint256', desc: 'The new deadline duration in seconds.' },
      ]
    },
    {
      name: 'getArk',
      desc: 'Returns beneficiary, deadline, deadline duration, and tokens for a user\'s Ark.',
      params: [
        { name: 'user', type: 'address', desc: 'The address of the user to query.' },
      ],
      returns: [
        { name: 'beneficiary', type: 'address', desc: 'The beneficiary address.' },
        { name: 'deadline', type: 'uint256', desc: 'The deadline timestamp.' },
        { name: 'deadlineDuration', type: 'uint256', desc: 'The deadline duration in seconds.' },
        { name: 'tokens', type: 'address[]', desc: 'The array of token addresses.' },
      ]
    },
  ],
  events: [
    {
      name: 'ArkBuilt',
      desc: 'Emitted when a new Ark is created.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user who built the Ark.' },
        { name: 'beneficiary', type: 'address indexed', desc: 'The address designated to receive tokens.' },
        { name: 'deadline', type: 'uint256', desc: 'The initial deadline timestamp for the Ark.' },
      ]
    },
    {
      name: 'ArkPinged',
      desc: 'Emitted when an Ark\'s deadline is reset via ping.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user who pinged their Ark.' },
        { name: 'newDeadline', type: 'uint256', desc: 'The updated deadline timestamp.' },
      ]
    },
    {
      name: 'FloodTriggered',
      desc: 'Emitted when a flood is triggered and tokens are transferred to the beneficiary.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user whose Ark was flooded.' },
        { name: 'beneficiary', type: 'address indexed', desc: 'The address that received the tokens.' },
      ]
    },
    {
      name: 'PassengersAdded',
      desc: 'Emitted when new tokens are added to an Ark.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user who added passengers.' },
        { name: 'newPassengers', type: 'address[]', desc: 'The array of token addresses that were added.' },
      ]
    },
    {
      name: 'PassengerRemoved',
      desc: 'Emitted when a token is removed from an Ark.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user who removed the passenger.' },
        { name: 'passenger', type: 'address', desc: 'The token address that was removed.' },
      ]
    },
    {
      name: 'DeadlineUpdated',
      desc: 'Emitted when the deadline duration is updated.',
      params: [
        { name: 'user', type: 'address indexed', desc: 'The address of the user who updated the duration.' },
        { name: 'newDuration', type: 'uint256', desc: 'The new duration in seconds.' },
        { name: 'newDeadline', type: 'uint256', desc: 'The recalculated deadline timestamp.' },
      ]
    },
  ]
};
