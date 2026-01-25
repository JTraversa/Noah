import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { NOAH_ADDRESS, NOAH_ABI, MOCK_USDC_ADDRESS, ERC20_ABI } from '../../contracts/noah';

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
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [newDurationMinutes, setNewDurationMinutes] = useState('');
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [selectedTokensToAdd, setSelectedTokensToAdd] = useState([]);

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

  // Update duration contract write
  const { data: updateHash, writeContract: writeUpdate, isPending: isUpdating } = useWriteContract();
  const { isLoading: isUpdateConfirming, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateHash,
  });

  // Remove passenger contract write
  const [removingToken, setRemovingToken] = useState(null);
  const { data: removeHash, writeContract: writeRemove, isPending: isRemoving } = useWriteContract();
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({
    hash: removeHash,
  });

  // Add passengers contract write
  const { data: addHash, writeContract: writeAdd, isPending: isAdding } = useWriteContract();
  const { isLoading: isAddConfirming, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({
    hash: addHash,
  });

  // Destroy ark contract write
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const { data: destroyHash, writeContract: writeDestroy, isPending: isDestroying } = useWriteContract();
  const { isLoading: isDestroyConfirming, isSuccess: isDestroySuccess } = useWaitForTransactionReceipt({
    hash: destroyHash,
  });

  // Read USDC balance for available tokens
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  // Build available tokens list (tokens not already in ark)
  const availableTokens = React.useMemo(() => {
    const tokens = [];
    if (usdcBalance !== undefined) {
      const isAlreadyAdded = ark?.tokens?.some(
        (t) => t.toLowerCase() === MOCK_USDC_ADDRESS.toLowerCase()
      );
      if (!isAlreadyAdded) {
        tokens.push({
          address: MOCK_USDC_ADDRESS,
          symbol: 'USDC',
          balance: formatUnits(usdcBalance, 6),
        });
      }
    }
    return tokens;
  }, [usdcBalance, ark?.tokens]);

  // Refetch ark data after successful ping, update, remove, add, or destroy
  useEffect(() => {
    if (isPingSuccess || isUpdateSuccess || isRemoveSuccess || isAddSuccess || isDestroySuccess) {
      refetch();
      if (isUpdateSuccess) {
        setIsEditingDuration(false);
        setNewDurationMinutes('');
      }
      if (isRemoveSuccess) {
        setRemovingToken(null);
      }
      if (isAddSuccess) {
        setShowAddTokenModal(false);
        setSelectedTokensToAdd([]);
      }
      if (isDestroySuccess) {
        setShowDestroyConfirm(false);
      }
    }
  }, [isPingSuccess, isUpdateSuccess, isRemoveSuccess, isAddSuccess, isDestroySuccess, refetch]);

  const handlePing = () => {
    writePing({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'pingArk',
      args: [],
    });
  };

  const handleUpdateDuration = () => {
    const minutes = parseInt(newDurationMinutes, 10);
    if (minutes > 0) {
      writeUpdate({
        address: NOAH_ADDRESS,
        abi: NOAH_ABI,
        functionName: 'updateDeadlineDuration',
        args: [BigInt(minutes * 60)],
      });
    }
  };

  const handleRemoveToken = (tokenAddress) => {
    setRemovingToken(tokenAddress);
    writeRemove({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'removePassenger',
      args: [tokenAddress],
    });
  };

  const toggleTokenToAdd = (tokenAddress) => {
    setSelectedTokensToAdd((prev) =>
      prev.includes(tokenAddress)
        ? prev.filter((a) => a !== tokenAddress)
        : [...prev, tokenAddress]
    );
  };

  const handleAddTokens = () => {
    if (selectedTokensToAdd.length > 0) {
      writeAdd({
        address: NOAH_ADDRESS,
        abi: NOAH_ABI,
        functionName: 'addPassengers',
        args: [selectedTokensToAdd],
      });
    }
  };

  const handleDestroyArk = () => {
    writeDestroy({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'destroyArk',
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
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-slate-500">Deadline Duration</div>
            {!isEditingDuration && (
              <button
                onClick={() => setIsEditingDuration(true)}
                className="text-xs text-indigo-500 hover:text-indigo-600"
              >
                Edit
              </button>
            )}
          </div>
          {isEditingDuration ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={newDurationMinutes}
                  onChange={(e) => setNewDurationMinutes(e.target.value)}
                  placeholder="Enter minutes"
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                />
                <span className="text-xs text-slate-500">minutes</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateDuration}
                  disabled={!newDurationMinutes || parseInt(newDurationMinutes, 10) <= 0 || isUpdating || isUpdateConfirming}
                  className="flex-1 px-3 py-2 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 disabled:opacity-50"
                >
                  {isUpdating ? 'Confirm...' : isUpdateConfirming ? 'Updating...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingDuration(false);
                    setNewDurationMinutes('');
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
              {isUpdateSuccess && (
                <div className="text-xs text-green-600">Duration updated successfully!</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-700">
              {formatDuration(ark.deadlineDuration)}
              <span className="text-xs text-slate-400 ml-2">
                ({Math.floor(Number(ark.deadlineDuration) / 60)} minutes)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Protected Tokens */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Protected Tokens ({ark.tokens.length})</h3>
          <button
            onClick={() => setShowAddTokenModal(true)}
            className="text-xs text-indigo-500 hover:text-indigo-600"
          >
            + Add Token
          </button>
        </div>
        <div className="space-y-2">
          {ark.tokens.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-400">
              No tokens protected yet.
            </div>
          ) : (
            ark.tokens.map((tokenAddress) => {
              const isBeingRemoved = removingToken === tokenAddress && (isRemoving || isRemoveConfirming);
              return (
                <div
                  key={tokenAddress}
                  className={`flex items-center justify-between p-3 bg-slate-50/50 rounded-xl ${isBeingRemoved ? 'opacity-50' : ''}`}
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
                  <button
                    onClick={() => handleRemoveToken(tokenAddress)}
                    disabled={isRemoving || isRemoveConfirming}
                    className="px-3 py-1 text-xs font-medium text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBeingRemoved ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500 mb-2">Danger Zone</div>
        {showDestroyConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-700">
              Are you sure you want to destroy your Ark? This will deactivate your dead man's switch. You can create a new one afterward.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDestroyArk}
                disabled={isDestroying || isDestroyConfirming}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {isDestroying ? 'Confirm in Wallet...' : isDestroyConfirming ? 'Destroying...' : 'Yes, Destroy Ark'}
              </button>
              <button
                onClick={() => setShowDestroyConfirm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 text-sm font-medium rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDestroyConfirm(true)}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Destroy Ark
          </button>
        )}
      </div>

      {/* Add Token Modal */}
      {showAddTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddTokenModal(false);
              setSelectedTokensToAdd([]);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-700">Add Tokens</h3>
              <button
                onClick={() => {
                  setShowAddTokenModal(false);
                  setSelectedTokensToAdd([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            {availableTokens.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm text-slate-500">
                  All your tokens are already protected!
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  Select tokens to add to your Ark:
                </p>
                <div className="space-y-2 mb-4">
                  {availableTokens.map((token) => (
                    <button
                      key={token.address}
                      type="button"
                      onClick={() => toggleTokenToAdd(token.address)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        selectedTokensToAdd.includes(token.address)
                          ? 'bg-indigo-50 border-2 border-indigo-400'
                          : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                          {token.symbol.charAt(0)}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-slate-700">{token.symbol}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {token.address.slice(0, 6)}...{token.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-slate-600">
                          {parseFloat(token.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedTokensToAdd.includes(token.address)
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedTokensToAdd.includes(token.address) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddTokens}
                  disabled={selectedTokensToAdd.length === 0 || isAdding || isAddConfirming}
                  className="w-full px-4 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isAdding ? 'Confirm in Wallet...' : isAddConfirming ? 'Adding...' : `Add ${selectedTokensToAdd.length} Token${selectedTokensToAdd.length !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageTab;
