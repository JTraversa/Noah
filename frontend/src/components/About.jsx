import React from 'react';
import { Link } from 'react-router-dom';

const contracts = [
  {
    name: 'Noah',
    version: 'V1',
    file: 'noah.sol',
    description: 'A dead man\'s switch contract to transfer a user\'s tokens to a beneficiary after a set time.',
    struct: {
      name: 'Ark',
      fields: [
        { name: 'beneficiary', type: 'address', desc: 'Address that receives tokens when flood is triggered' },
        { name: 'deadline', type: 'uint256', desc: 'Timestamp when the Ark can be flooded' },
        { name: 'deadlineDuration', type: 'uint256', desc: 'Duration in seconds for deadline resets' },
        { name: 'tokens', type: 'address[]', desc: 'Array of token addresses managed by this Ark' },
      ]
    },
    functions: [
      { name: 'buildArk', params: 'address beneficiary, uint256 deadlineDuration, address[] tokens', desc: 'Builds an Ark for the caller. Sets beneficiary, deadline duration, and tokens to manage.' },
      { name: 'pingArk', params: '', desc: 'Pings an Ark to reset its timer, extending the deadline.' },
      { name: 'flood', params: 'address user', desc: 'Triggers flood process for a user, transferring their tokens to beneficiary. Only callable after deadline.' },
      { name: 'addPassengers', params: 'address[] newTokens', desc: 'Adds new passengers (tokens) to a user\'s Ark.' },
      { name: 'removePassenger', params: 'address token', desc: 'Removes a passenger (token) from a user\'s Ark.' },
      { name: 'updateDeadlineDuration', params: 'uint256 newDuration', desc: 'Updates the deadline duration for future resets.' },
      { name: 'getArk', params: 'address user', desc: 'Returns beneficiary, deadline, and deadline duration for a user\'s Ark.' },
    ],
    events: ['ArkBuilt', 'ArkPinged', 'FloodTriggered', 'PassengersAdded', 'PassengerRemoved', 'DeadlineUpdated']
  },
  {
    name: 'Noah',
    version: 'V2',
    file: 'noahv2.sol',
    description: 'A dead man\'s switch contract with per-token Ark management for more granular control.',
    struct: {
      name: 'Ark',
      fields: [
        { name: 'beneficiary', type: 'address', desc: 'Address that receives tokens when flood is triggered' },
        { name: 'deadline', type: 'uint256', desc: 'Timestamp when the Ark can be flooded' },
        { name: 'deadlineDuration', type: 'uint256', desc: 'Duration in seconds for deadline resets' },
      ]
    },
    functions: [
      { name: 'buildArk', params: 'address beneficiary, uint256 deadlineDuration, address[] tokens', desc: 'Builds individual Arks for each token provided. Creates separate Ark per token for granular control.' },
      { name: 'destroyArk', params: 'address token', desc: 'Destroys an Ark for a specific token, removing protection for that asset.' },
      { name: 'pingArk', params: 'address[] tokens', desc: 'Pings multiple Arks to reset their timers. Accepts array of tokens to ping.' },
      { name: 'flood', params: 'address[] users, address[] tokens', desc: 'Triggers flood for multiple user/token pairs. Transfers tokens to respective beneficiaries.' },
      { name: 'updateDeadlineDuration', params: 'address token, uint256 newDuration', desc: 'Updates deadline duration for a specific token\'s Ark.' },
      { name: 'getArk', params: 'address user, address token', desc: 'Returns Ark data for a specific user and token combination.' },
    ],
    events: ['ArkBuilt', 'ArkDestroyed', 'ArkPinged', 'FloodTriggered', 'DeadlineUpdated']
  }
];

function ContractDoc({ contract }) {
  return (
    <div className="glass-dark rounded-xl md:rounded-2xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm md:text-base font-semibold text-slate-700">{contract.name}</h4>
        <span className="text-[10px] md:text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{contract.version}</span>
        <span className="text-[10px] md:text-xs text-slate-400 font-mono">{contract.file}</span>
      </div>

      <p className="text-xs md:text-sm text-slate-600 mb-4">{contract.description}</p>

      {/* Struct */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Struct: {contract.struct.name}</h5>
        <div className="bg-slate-50/50 rounded-lg p-3 space-y-1">
          {contract.struct.fields.map((field, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
              <code className="text-indigo-600 font-mono whitespace-nowrap">{field.type}</code>
              <code className="text-slate-700 font-mono font-semibold">{field.name}</code>
              <span className="text-slate-500">— {field.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Functions */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Functions</h5>
        <div className="space-y-2">
          {contract.functions.map((fn, i) => (
            <div key={i} className="bg-slate-50/50 rounded-lg p-3">
              <code className="text-[10px] md:text-xs font-mono">
                <span className="text-indigo-600 font-semibold">{fn.name}</span>
                <span className="text-slate-500">({fn.params})</span>
              </code>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1">{fn.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Events</h5>
        <div className="flex flex-wrap gap-1.5">
          {contract.events.map((event, i) => (
            <code key={i} className="text-[10px] md:text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-mono">{event}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/"
        className="glass-btn self-start px-4 py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2"
      >
        <span>←</span> Back
      </Link>

      {/* Blurb */}
      <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-3">About Noah</h2>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
          Noah is a decentralized dead man's switch protocol that ensures your digital assets reach your intended beneficiaries
          in case of loss of life, hardware damage, or loss of access to your wallet.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
          By creating an "Ark" for your tokens, you establish a trustless inheritance system. Simply ping your Ark periodically
          to signal you're still in control. If the deadline passes without a ping, anyone can trigger a "flood" that transfers
          your assets to your designated beneficiary — incentivized through MEV opportunities.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
          No centralized custody. No trusted third parties. Just smart contracts protecting your crypto legacy.
        </p>
      </div>

      {/* Technical Documentation */}
      <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Technical Documentation</h3>
        <p className="text-xs md:text-sm text-slate-500 mb-4">
          Smart contract specifications derived from NatSpec documentation.
        </p>
        <div className="space-y-4">
          {contracts.map((contract, i) => (
            <ContractDoc key={i} contract={contract} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default About;
