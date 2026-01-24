import React, { useState } from 'react';

// Mock Ark data - will be replaced with real contract data
const mockArk = {
  beneficiary: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD45',
  deadline: Date.now() + 86400 * 30 * 1000, // 30 days from now
  deadlineDuration: 2592000, // 30 days in seconds
  tokens: [
    { address: '0x1234...5678', symbol: 'WETH', balance: '2.45' },
    { address: '0x2345...6789', symbol: 'USDC', balance: '1,500.00' },
    { address: '0x3456...7890', symbol: 'ARB', balance: '850.00' },
  ],
};

function formatTimeRemaining(deadline) {
  const now = Date.now();
  const diff = deadline - now;

  if (diff <= 0) return { text: 'Expired', urgent: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `${days}d ${hours}h remaining`, urgent: days < 3 };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m remaining`, urgent: true };
  }
  return { text: `${minutes}m remaining`, urgent: true };
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  if (days >= 365) return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
  if (days >= 30) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
  if (days >= 7) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function ManageTab() {
  const [ark] = useState(mockArk);
  const [isPinging, setIsPinging] = useState(false);

  const timeRemaining = formatTimeRemaining(ark.deadline);

  const handlePing = () => {
    setIsPinging(true);
    // Simulate ping - will be replaced with actual contract call
    setTimeout(() => {
      setIsPinging(false);
      console.log('Ark pinged!');
    }, 1500);
  };

  if (!ark) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🏗️</div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          No Ark Found
        </h3>
        <p className="text-sm text-slate-500">
          You haven't created an Ark yet. Go to the Create tab to build one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-xl p-4 ${timeRemaining.urgent ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 mb-1">Time Until Deadline</div>
            <div className={`text-lg font-bold ${timeRemaining.urgent ? 'text-red-600' : 'text-green-600'}`}>
              {timeRemaining.text}
            </div>
          </div>
          <button
            onClick={handlePing}
            disabled={isPinging}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              timeRemaining.urgent
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            {isPinging ? 'Pinging...' : 'Ping Ark'}
          </button>
        </div>
      </div>

      {/* Ark Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Ark Details</h3>

        {/* Beneficiary */}
        <div className="bg-slate-50/50 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Beneficiary</div>
          <div className="font-mono text-sm text-slate-700 break-all">{ark.beneficiary}</div>
        </div>

        {/* Duration */}
        <div className="bg-slate-50/50 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Deadline Duration</div>
          <div className="text-sm text-slate-700">{formatDuration(ark.deadlineDuration)}</div>
        </div>
      </div>

      {/* Protected Tokens */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Protected Tokens</h3>
          <button className="text-xs text-indigo-500 hover:text-indigo-600">
            + Add Token
          </button>
        </div>
        <div className="space-y-2">
          {ark.tokens.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                  {token.symbol.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">{token.symbol}</div>
                  <div className="text-xs text-slate-400 font-mono">{token.address}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-700">{token.balance}</div>
                <button className="text-slate-400 hover:text-red-500 transition-colors">
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500 mb-2">Danger Zone</div>
        <button className="text-sm text-red-500 hover:text-red-600 font-medium">
          Destroy Ark
        </button>
      </div>
    </div>
  );
}

export default ManageTab;
