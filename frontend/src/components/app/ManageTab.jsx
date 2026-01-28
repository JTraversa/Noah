import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useWalletClient } from 'wagmi';
import { useWriteContracts, useCallsStatus, useCapabilities } from 'wagmi/experimental';
import { formatUnits, maxUint256, encodeFunctionData } from 'viem';
import { NOAH_ADDRESS, NOAH_ABI, MOCK_USDC_ADDRESS, ERC20_ABI } from '../../contracts/noah';
import { refreshActivity } from './ActivityTab';

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

const API_BASE_URL = 'https://noah-backend.fly.dev';

function ManageTab() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [tokenBalances, setTokenBalances] = useState({});
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [newDurationMinutes, setNewDurationMinutes] = useState('');
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [selectedTokensToAdd, setSelectedTokensToAdd] = useState([]);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [customTokenError, setCustomTokenError] = useState('');
  const [customTokens, setCustomTokens] = useState([]);
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);
  const [showDestroyPendingModal, setShowDestroyPendingModal] = useState(false);
  const [destroyConfirmedOnChain, setDestroyConfirmedOnChain] = useState(false);

  // Approval state for adding tokens
  const [tokenAllowances, setTokenAllowances] = useState({});
  const [isCheckingAllowances, setIsCheckingAllowances] = useState(false);

  // Parallel approval state (fallback for wallets without batching)
  // approvalTxs: [{ token: address, hash: txHash, status: 'signing' | 'confirming' | 'confirmed' | 'error', error?: string }]
  const [approvalTxs, setApprovalTxs] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isSigningApprovals, setIsSigningApprovals] = useState(false);
  const approvalPollingRef = useRef(null);

  // Get wallet client for parallel approvals
  const { data: walletClient } = useWalletClient();

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
    query: { refetchInterval: 500 },
  });

  // Update duration contract write
  const { data: updateHash, writeContract: writeUpdate, isPending: isUpdating } = useWriteContract();
  const { isLoading: isUpdateConfirming, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateHash,
    query: { refetchInterval: 500 },
  });

  // Remove passenger contract write
  const [removingToken, setRemovingToken] = useState(null);
  const [lastProcessedRemoveHash, setLastProcessedRemoveHash] = useState(null);
  const { data: removeHash, writeContract: writeRemove, isPending: isRemoving } = useWriteContract();
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({
    hash: removeHash,
    query: { refetchInterval: 500 },
  });

  // Add passengers contract write
  const [lastProcessedAddHash, setLastProcessedAddHash] = useState(null);
  const { data: addHash, writeContract: writeAdd, isPending: isAdding, error: addError, reset: resetAdd } = useWriteContract();
  const { isLoading: isAddConfirming, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({
    hash: addHash,
    query: { refetchInterval: 500 },
  });

  // Check wallet capabilities (EIP-5792 support)
  const { data: capabilities } = useCapabilities();

  // Check if wallet supports atomic batching
  const supportsBatching = useMemo(() => {
    if (!capabilities || !chainId) return false;
    const chainCaps = capabilities[chainId];
    return chainCaps?.atomicBatch?.supported === true;
  }, [capabilities, chainId]);

  // Batched writes for approvals + add tokens (EIP-5792)
  const {
    data: batchId,
    writeContracts,
    isPending: isBatchPending,
    error: batchError,
  } = useWriteContracts();

  // Check batch status
  const { data: callsStatus } = useCallsStatus({
    id: batchId,
    query: { enabled: !!batchId, refetchInterval: 500 },
  });

  const isBatchConfirming = callsStatus?.status === 'PENDING';
  const isBatchSuccess = callsStatus?.status === 'CONFIRMED';


  // Destroy ark contract write
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const { data: destroyHash, writeContract: writeDestroy, isPending: isDestroying } = useWriteContract();
  const { isLoading: isDestroyConfirming, isSuccess: isDestroySuccess } = useWaitForTransactionReceipt({
    hash: destroyHash,
    query: { refetchInterval: 500 },
  });

  // Read USDC balance for available tokens
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  // Check allowance for a token
  const checkAllowance = useCallback(async (tokenAddress) => {
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, NOAH_ADDRESS],
      });
      return allowance > 0n;
    } catch (err) {
      console.error('Error checking allowance:', err);
      return false;
    }
  }, [publicClient, address]);

  // Check approvals for selected tokens to add
  const checkApprovalsForSelectedTokens = useCallback(async () => {
    if (!address || selectedTokensToAdd.length === 0) {
      setTokenAllowances({});
      return;
    }

    setIsCheckingAllowances(true);
    const allowances = {};

    for (const tokenAddr of selectedTokensToAdd) {
      allowances[tokenAddr] = await checkAllowance(tokenAddr);
    }

    setTokenAllowances(allowances);
    setIsCheckingAllowances(false);
  }, [address, selectedTokensToAdd, checkAllowance]);

  // Check approvals when selected tokens change or modal opens
  useEffect(() => {
    if (showAddTokenModal) {
      checkApprovalsForSelectedTokens();
    }
  }, [selectedTokensToAdd, showAddTokenModal, checkApprovalsForSelectedTokens]);

  // Re-check allowances after batch success
  useEffect(() => {
    if (isBatchSuccess) {
      checkApprovalsForSelectedTokens();
      refetch();
    }
  }, [isBatchSuccess, checkApprovalsForSelectedTokens, refetch]);

  // Get tokens that need approval
  const tokensNeedingApproval = selectedTokensToAdd.filter(addr => !tokenAllowances[addr]);

  // Check if all selected tokens are approved
  const allSelectedTokensApproved = selectedTokensToAdd.length > 0 &&
    selectedTokensToAdd.every(addr => tokenAllowances[addr] === true);

  // Batched approve and add tokens (for smart wallets)
  const handleBatchedApproveAndAdd = () => {
    const contracts = [];

    // Add approval calls for tokens that need it
    for (const tokenAddr of tokensNeedingApproval) {
      contracts.push({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [NOAH_ADDRESS, maxUint256],
      });
    }

    // Add the addPassengers call
    contracts.push({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'addPassengers',
      args: [selectedTokensToAdd],
    });

    writeContracts({ contracts });
  };

  // Sequential signing flow - sign one at a time, but track confirmations in parallel
  const startParallelApprovals = async () => {
    if (tokensNeedingApproval.length === 0 || !walletClient) return;

    // Initialize approval tracking state - all start as 'pending'
    const initialTxs = tokensNeedingApproval.map(token => ({
      token,
      hash: null,
      status: 'pending', // 'pending' | 'signing' | 'confirming' | 'confirmed' | 'error'
      error: null,
    }));
    setApprovalTxs(initialTxs);
    setShowApprovalModal(true);
    setIsSigningApprovals(true);

    // Sign transactions SEQUENTIALLY - wallets can't handle parallel signing requests
    for (let i = 0; i < tokensNeedingApproval.length; i++) {
      const tokenAddr = tokensNeedingApproval[i];

      // Update current token to 'signing' status
      setApprovalTxs(prev => prev.map((tx, idx) =>
        idx === i ? { ...tx, status: 'signing' } : tx
      ));

      try {
        const hash = await walletClient.writeContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [NOAH_ADDRESS, maxUint256],
        });

        // Update with hash and move to 'confirming' status
        setApprovalTxs(prev => prev.map((tx, idx) =>
          idx === i ? { ...tx, hash, status: 'confirming' } : tx
        ));
      } catch (err) {
        // User rejected or error
        setApprovalTxs(prev => prev.map((tx, idx) =>
          idx === i ? { ...tx, status: 'error', error: err.shortMessage || err.message } : tx
        ));
        // If user rejects, stop the entire flow
        if (err.message?.includes('reject') || err.message?.includes('denied') || err.code === 4001) {
          break;
        }
        // For other errors, continue to next token
      }
    }

    setIsSigningApprovals(false);
  };

  // Keep a ref to current approvalTxs for stable polling
  const approvalTxsRef = useRef([]);
  useEffect(() => {
    approvalTxsRef.current = approvalTxs;
  }, [approvalTxs]);

  // Poll for approval transaction confirmations (stable interval)
  useEffect(() => {
    if (!showApprovalModal || !walletClient) return;

    const pollConfirmations = async () => {
      const currentTxs = approvalTxsRef.current;
      if (currentTxs.length === 0) return;

      const pendingTxs = currentTxs.filter(tx => tx.status === 'confirming' && tx.hash);

      for (const tx of pendingTxs) {
        try {
          // Use walletClient's transport to avoid RPC CORS issues
          const receipt = await walletClient.request({
            method: 'eth_getTransactionReceipt',
            params: [tx.hash],
          });
          if (receipt) {
            setApprovalTxs(prev => prev.map(t =>
              t.token === tx.token ? { ...t, status: 'confirmed' } : t
            ));
          }
        } catch (err) {
          // Transaction not yet mined, continue polling
        }
      }
    };

    // Poll immediately once, then set interval
    pollConfirmations();
    approvalPollingRef.current = setInterval(pollConfirmations, 500);

    return () => {
      if (approvalPollingRef.current) {
        clearInterval(approvalPollingRef.current);
      }
    };
  }, [showApprovalModal, walletClient]);

  // Handle completion when all approvals are done
  useEffect(() => {
    if (!showApprovalModal || approvalTxs.length === 0) return;

    const allDone = approvalTxs.every(tx => tx.status === 'confirmed' || tx.status === 'error');
    if (!allDone) return;

    // Update allowances for confirmed ones
    const confirmed = approvalTxs.filter(tx => tx.status === 'confirmed');
    if (confirmed.length > 0) {
      setTokenAllowances(prev => {
        const updated = { ...prev };
        confirmed.forEach(tx => { updated[tx.token] = true; });
        return updated;
      });
    }

    // Check if all succeeded
    const allConfirmed = approvalTxs.every(tx => tx.status === 'confirmed');
    if (allConfirmed) {
      // Close modal after a short delay
      setTimeout(() => {
        setShowApprovalModal(false);
        setApprovalTxs([]);
      }, 500);
    }
  }, [showApprovalModal, approvalTxs]);

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

  // Refetch ark data after successful remove
  useEffect(() => {
    if (isRemoveSuccess && removeHash && removeHash !== lastProcessedRemoveHash) {
      setLastProcessedRemoveHash(removeHash);
      refetch();
      refreshActivity(address, chainId);
      setRemovingToken(null);
    }
  }, [isRemoveSuccess, removeHash, lastProcessedRemoveHash, refetch, address, chainId]);

  // Refetch ark data after successful add
  useEffect(() => {
    if (isAddSuccess && addHash && addHash !== lastProcessedAddHash) {
      setLastProcessedAddHash(addHash);
      refetch();
      refreshActivity(address, chainId);
      setShowAddTokenModal(false);
      setSelectedTokensToAdd([]);
      setCustomTokens([]);
      setCustomTokenAddress('');
      setCustomTokenError('');
    }
  }, [isAddSuccess, addHash, lastProcessedAddHash, refetch, address, chainId]);

  // Refetch ark data after successful ping, update, or destroy
  useEffect(() => {
    if (isPingSuccess || isUpdateSuccess || isDestroySuccess) {
      refetch();
      refreshActivity(address, chainId);
      if (isUpdateSuccess) {
        setIsEditingDuration(false);
        setNewDurationMinutes('');
      }
      if (isDestroySuccess) {
        setShowDestroyConfirm(false);
        setDestroyConfirmedOnChain(true);
        setShowDestroyPendingModal(true);
      }
    }
  }, [isPingSuccess, isUpdateSuccess, isDestroySuccess, refetch, address, chainId]);

  // Poll API to check if ark has been destroyed
  useEffect(() => {
    if (!destroyConfirmedOnChain || !address) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/arks/${address}`);
        const data = await response.json();

        // If no arks found for this address on current chain, destruction is complete
        if (!data || data.length === 0 || (Array.isArray(data) && data.every(ark => ark.chain_id !== chainId))) {
          setShowDestroyPendingModal(false);
          setDestroyConfirmedOnChain(false);
          // Refresh activity cache
          refreshActivity(address, chainId);
          refetch(); // Refresh the local state
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling API:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [destroyConfirmedOnChain, address, chainId, refetch]);

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
    if (selectedTokensToAdd.length === 0) return;

    if (tokensNeedingApproval.length > 0) {
      if (supportsBatching) {
        // Smart wallet - batch approvals + add in one tx
        handleBatchedApproveAndAdd();
      } else {
        // EOA wallet - send all approvals at once, wait for confirmations
        startParallelApprovals();
      }
    } else {
      // All tokens approved, just add them
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

  const isValidAddress = (addr) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const addCustomTokenToList = async () => {
    const trimmedAddress = customTokenAddress.trim();

    if (!isValidAddress(trimmedAddress)) {
      setCustomTokenError('Invalid address format');
      return;
    }

    // Check if already in ark
    if (ark?.tokens?.some(t => t.toLowerCase() === trimmedAddress.toLowerCase())) {
      setCustomTokenError('Token already in your Ark');
      return;
    }

    // Check if already in available tokens or custom tokens
    if (availableTokens.some(t => t.address.toLowerCase() === trimmedAddress.toLowerCase()) ||
        customTokens.some(t => t.address.toLowerCase() === trimmedAddress.toLowerCase())) {
      setCustomTokenError('Token already in list');
      return;
    }

    setIsLoadingCustomToken(true);
    setCustomTokenError('');

    try {
      // Fetch token data from chain
      const [symbol, decimals, balance] = await Promise.all([
        publicClient.readContract({
          address: trimmedAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: trimmedAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: trimmedAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      const formattedBalance = formatUnits(balance, decimals);
      const newToken = {
        address: trimmedAddress,
        symbol: symbol || 'UNKNOWN',
        balance: parseFloat(formattedBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }),
        isCustom: true,
      };

      setCustomTokens(prev => [...prev, newToken]);
      setSelectedTokensToAdd(prev => [...prev, trimmedAddress]);
      setCustomTokenAddress('');
    } catch (err) {
      console.error('Failed to fetch token data:', err);
      setCustomTokenError('Failed to fetch token data. Is this a valid ERC20 token?');
    } finally {
      setIsLoadingCustomToken(false);
    }
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
              setCustomTokens([]);
              setCustomTokenAddress('');
              setCustomTokenError('');
              setTokenAllowances({});
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-700">Add Tokens</h3>
              <button
                onClick={() => {
                  setShowAddTokenModal(false);
                  setSelectedTokensToAdd([]);
                  setCustomTokens([]);
                  setCustomTokenAddress('');
                  setCustomTokenError('');
                  setTokenAllowances({});
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Select tokens to add to your Ark:
            </p>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {/* Available tokens from wallet */}
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
                    {selectedTokensToAdd.includes(token.address) && (
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        tokenAllowances[token.address]
                          ? 'bg-green-100 text-green-600'
                          : isCheckingAllowances
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {tokenAllowances[token.address] ? '✓' :
                         isCheckingAllowances ? '...' :
                         '!'}
                      </div>
                    )}
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

              {/* Custom tokens */}
              {customTokens.map((token) => (
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
                    <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-600">
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-slate-700">
                        {token.symbol}
                        <span className="ml-1 text-xs text-purple-500">(custom)</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-600">
                      {token.balance}
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

              {/* Custom Token Input - as a list item */}
              <div className={`w-full p-3 rounded-xl transition-all bg-slate-50 border-2 ${
                customTokenAddress ? 'border-purple-300' : 'border-transparent'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-400">
                    +
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={customTokenAddress}
                      onChange={(e) => {
                        setCustomTokenAddress(e.target.value);
                        setCustomTokenError('');
                      }}
                      placeholder="Add custom token address..."
                      className="flex-1 px-2 py-1 rounded-lg bg-transparent border-none focus:outline-none text-sm font-mono text-slate-700 placeholder:text-slate-400"
                    />
                    {customTokenAddress && (
                      <button
                        type="button"
                        onClick={addCustomTokenToList}
                        disabled={isLoadingCustomToken}
                        className="px-3 py-1 rounded-lg bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 disabled:opacity-50 transition-all"
                      >
                        {isLoadingCustomToken ? '...' : 'Add'}
                      </button>
                    )}
                  </div>
                </div>
                {customTokenError && (
                  <p className="text-xs text-red-500 mt-1 ml-11">{customTokenError}</p>
                )}
              </div>
            </div>
            {/* Approval section */}
            {selectedTokensToAdd.length > 0 && tokensNeedingApproval.length > 0 && !isCheckingAllowances && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-700">
                      {tokensNeedingApproval.length} token{tokensNeedingApproval.length !== 1 ? 's need' : ' needs'} approval
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {supportsBatching
                        ? 'All approvals will be bundled into one transaction'
                        : 'Each token will need a separate approval'}
                    </p>
                  </div>
                  {supportsBatching && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ⚡ Batched
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleAddTokens}
              disabled={selectedTokensToAdd.length === 0 || isAdding || isAddConfirming || isBatchPending || isBatchConfirming || showApprovalModal}
              className="w-full px-4 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAdding || isBatchPending ? 'Confirm in Wallet...' :
               isAddConfirming || isBatchConfirming ? 'Adding...' :
               tokensNeedingApproval.length > 0
                 ? (supportsBatching ? `Approve & Add (${tokensNeedingApproval.length + 1} txs bundled)` : `Approve & Add ${selectedTokensToAdd.length} Token${selectedTokensToAdd.length !== 1 ? 's' : ''}`)
                 : `Add ${selectedTokensToAdd.length} Token${selectedTokensToAdd.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Parallel Approval Progress Modal */}
      {showApprovalModal && approvalTxs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <button
              onClick={() => {
                setShowApprovalModal(false);
                setApprovalTxs([]);
                if (approvalPollingRef.current) {
                  clearInterval(approvalPollingRef.current);
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <span className="text-xl">&times;</span>
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Approving Tokens ({approvalTxs.filter(tx => tx.status === 'confirmed').length}/{approvalTxs.length})
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {isSigningApprovals
                  ? 'Please confirm each approval in your wallet'
                  : 'Waiting for confirmations...'}
              </p>

              {/* Token approval list */}
              <div className="space-y-2 mb-4">
                {approvalTxs.map((tx) => {
                  const token = [...availableTokens, ...customTokens].find(t => t.address === tx.token);
                  return (
                    <div key={tx.token} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">
                        {token?.symbol || tx.token.slice(0, 8)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                        tx.status === 'error' ? 'bg-red-100 text-red-600' :
                        tx.status === 'confirming' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                        tx.status === 'signing' ? 'bg-yellow-100 text-yellow-600 animate-pulse' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {tx.status === 'confirmed' ? '✓ Done' :
                         tx.status === 'error' ? '✗ Failed' :
                         tx.status === 'confirming' ? 'Confirming...' :
                         tx.status === 'signing' ? 'Sign in wallet...' :
                         'Waiting...'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isSigningApprovals && (
                <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg p-3">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Please sign the transaction in your wallet</span>
                </div>
              )}

              {approvalTxs.some(tx => tx.status === 'error') && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-3">
                  <p className="text-xs text-red-600">
                    Some approvals failed. You can close this modal and try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Destroy Pending Modal */}
      {showDestroyPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDestroyPendingModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <button
              onClick={() => setShowDestroyPendingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <span className="text-xl">&times;</span>
            </button>

            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">🔥</div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Destroying Your Ark
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Your transaction has been confirmed on-chain. Waiting for the indexer to process the destruction...
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing destruction...</span>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                You can close this modal. The page will update automatically once complete.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageTab;
