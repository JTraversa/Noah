import React, { useState } from 'react';

const durationOptions = [
  { value: 604800, label: '1 Week' },
  { value: 2592000, label: '30 Days' },
  { value: 7776000, label: '90 Days' },
  { value: 31536000, label: '1 Year' },
  { value: 63072000, label: '2 Years' },
];

// Mock token list - will be replaced with actual wallet tokens
const mockTokens = [
  { address: '0x1234...5678', symbol: 'WETH', balance: '2.45', usdValue: 8100.50 },
  { address: '0x2345...6789', symbol: 'USDC', balance: '1,500.00', usdValue: 1500.00 },
  { address: '0x3456...7890', symbol: 'ARB', balance: '850.00', usdValue: 425.00 },
  { address: '0x4567...8901', symbol: 'GMX', balance: '12.5', usdValue: 562.50 },
  { address: '0x5678...9012', symbol: 'LINK', balance: '0.05', usdValue: 0.75 },
  { address: '0x6789...0123', symbol: 'UNI', balance: '0.001', usdValue: 0.01 },
];

function CreateTab() {
  const [beneficiary, setBeneficiary] = useState('');
  const [duration, setDuration] = useState(2592000);
  const [selectedTokens, setSelectedTokens] = useState([]);

  const toggleToken = (address) => {
    setSelectedTokens((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address]
    );
  };

  const selectAllTokens = () => {
    const eligibleTokens = mockTokens.filter((t) => t.usdValue > 1);
    setSelectedTokens(eligibleTokens.map((t) => t.address));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Creating Ark:', { beneficiary, duration, selectedTokens });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Beneficiary Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Beneficiary Address
        </label>
        <input
          type="text"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-mono"
        />
        <p className="text-xs text-slate-400 mt-1">
          The address that will receive your tokens if the deadline passes
        </p>
      </div>

      {/* Duration Select */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Deadline Duration
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {durationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                duration === opt.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-50/50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          How long before your Ark can be triggered after your last ping
        </p>
      </div>

      {/* Token Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Select Tokens
          </label>
          <button
            type="button"
            onClick={selectAllTokens}
            className="text-xs text-indigo-500 hover:text-indigo-600"
            title="Selects tokens worth more than $1"
          >
            Select All (&gt;$1)
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {mockTokens.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => toggleToken(token.address)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                selectedTokens.includes(token.address)
                  ? 'bg-indigo-50 border-2 border-indigo-400'
                  : 'bg-slate-50/50 border-2 border-transparent hover:bg-slate-100'
              } ${token.usdValue <= 1 ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                  {token.symbol.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-700">{token.symbol}</div>
                  <div className="text-xs text-slate-400 font-mono">{token.address}</div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">{token.balance}</div>
                  <div className="text-xs text-slate-400">${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedTokens.includes(token.address)
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-slate-300'
                }`}>
                  {selectedTokens.includes(token.address) && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {selectedTokens.length} token{selectedTokens.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!beneficiary || selectedTokens.length === 0}
        className="w-full solid-btn px-6 py-4 rounded-2xl font-semibold text-indigo-600 text-base shadow-lg shadow-indigo-400/45 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Build Your Ark
      </button>
    </form>
  );
}

export default CreateTab;
