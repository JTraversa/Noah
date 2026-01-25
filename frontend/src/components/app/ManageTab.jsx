import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { NOAH_ADDRESS, NOAH_ABI, ERC20_ABI } from '../../contracts/noah';

function formatTimeRemaining(deadlineTimestamp) {
  const now = Date.now();
  const deadline = Number(deadlineTimestamp) * 1000; // Convert from seconds to ms
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
  const secs = Number(seconds);
  const days = Math.floor(secs / 86400);
  if (days >= 365) return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
  if (days >= 30) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
  if (days >= 7) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function ManageTab() {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState({});

  // Read ark data from contract
  const { data: arkData, isLoading, refetch } = useReadContract({
    address: NOAH_ADDRESS,
    abi: NOAH_ABI,
    functionName: 'getArk',
    args: [address],
    enabled: !!address,
  });

  // Parse ark data
  const ark = arkData ? {
    beneficiary: arkData[0],
    deadline: arkData[1],
    deadlineDuration: arkData[2],
    tokens: arkData[3],
  } : null;

  const hasArk = ark && ark.deadline > 0n;

  // Ping contract write
  const { data: pingHash, writeContract: writePing, isPending: isPinging } = useWriteContract();
  const { isLoading: isPingConfirming, isSuccess: isPingSuccess } = useWaitForTransactionReceipt({
    hash: pingHash,
  });

  // Refetch ark data after successful ping
  useEffect(() => {
    if (isPingSuccess) {
      refetch();
    }
  }, [isPingSuccess, refetch]);

  const handlePing = () => {
    writePing({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'pingArk',
      args: [],
    });
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🔗</div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-slate-500">
          Connect your wallet to manage your Ark.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3 animate-pulse">🚢</div>
        <p className="text-sm text-slate-500">Loading your Ark...</p>
      </div>
    );
  }

  if (!hasArk) {
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

  const timeRemaining = formatTimeRemaining(ark.deadline);

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
            disabled={isPinging || isPingConfirming}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              timeRemaining.urgent
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            {isPinging ? 'Confirm in Wallet...' : isPingConfirming ? 'Pinging...' : 'Ping Ark'}
          </button>
        </div>
        {isPingSuccess && (
          <div className="mt-2 text-xs text-green-600">
            Ark pinged successfully! Deadline extended.
          </div>
        )}
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
          <h3 className="text-sm font-semibold text-slate-700">Protected Tokens ({ark.tokens.length})</h3>
          <button className="text-xs text-indigo-500 hover:text-indigo-600">
            + Add Token
          </button>
        </div>
        <div className="space-y-2">
          {ark.tokens.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-400">
              No tokens protected yet.
            </div>
          ) : (
            ark.tokens.map((tokenAddress) => (
              <div
                key={tokenAddress}
                className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                    T
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-mono">
                      {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                    </div>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors">
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ))
          )}
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
