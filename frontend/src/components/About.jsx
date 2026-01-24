import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const contract = {
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

function ExpandableItem({ name, desc, params, returns, type }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = (params && params.length > 0) || (returns && returns.length > 0);

  const paramString = params ? params.map(p => `${p.type} ${p.name}`).join(', ') : '';

  return (
    <div className="bg-slate-50/50 rounded-lg overflow-hidden">
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={`w-full p-3 flex items-center justify-between text-left ${hasDetails ? 'cursor-pointer hover:bg-slate-100/50' : 'cursor-default'}`}
      >
        <div className="flex-1 min-w-0">
          <code className="text-[10px] md:text-xs font-mono">
            <span className={`font-semibold ${type === 'event' ? 'text-amber-600' : 'text-indigo-600'}`}>{name}</span>
            <span className="text-slate-500">({paramString})</span>
          </code>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">{desc}</p>
        </div>
        {hasDetails && (
          <span className={`ml-2 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ›
          </span>
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200/50">
          {params && params.length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Parameters</div>
              <div className="space-y-1">
                {params.map((param, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
                    <code className="text-indigo-600 font-mono whitespace-nowrap">{param.type}</code>
                    <code className="text-slate-700 font-mono font-semibold">{param.name}</code>
                    <span className="text-slate-500">— {param.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {returns && returns.length > 0 && (
            <div>
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Returns</div>
              <div className="space-y-1">
                {returns.map((ret, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
                    <code className="text-green-600 font-mono whitespace-nowrap">{ret.type}</code>
                    <code className="text-slate-700 font-mono font-semibold">{ret.name}</code>
                    <span className="text-slate-500">— {ret.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContractDoc({ contract }) {
  return (
    <div className="glass-dark rounded-xl md:rounded-2xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm md:text-base font-semibold text-slate-700">{contract.name}</h4>
        <span className="text-[10px] md:text-xs text-slate-400 font-mono">{contract.file}</span>
      </div>

      <p className="text-xs md:text-sm text-slate-600 mb-4">{contract.description}</p>

      {/* Struct */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Struct: {contract.struct.name}</h5>
        <p className="text-[10px] md:text-xs text-slate-500 mb-2">{contract.struct.description}</p>
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

      {/* Mapping */}
      {contract.mapping && (
        <div className="mb-4">
          <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Storage</h5>
          <div className="bg-slate-50/50 rounded-lg p-3">
            <code className="text-[10px] md:text-xs font-mono">
              <span className="text-indigo-600">{contract.mapping.signature}</span>
              <span className="text-slate-700 font-semibold"> {contract.mapping.name}</span>
            </code>
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">{contract.mapping.desc}</p>
          </div>
        </div>
      )}

      {/* Functions */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Functions</h5>
        <div className="space-y-2">
          {contract.functions.map((fn, i) => (
            <ExpandableItem
              key={i}
              name={fn.name}
              desc={fn.desc}
              params={fn.params}
              returns={fn.returns}
              type="function"
            />
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Events</h5>
        <div className="space-y-2">
          {contract.events.map((event, i) => (
            <ExpandableItem
              key={i}
              name={event.name}
              desc={event.desc}
              params={event.params}
              type="event"
            />
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
        <ContractDoc contract={contract} />
      </div>
    </div>
  );
}

export default About;
