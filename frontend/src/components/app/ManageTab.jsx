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

  // Token metadata cache for displaying symbols/names
  const [tokenMetadata, setTokenMetadata] = useState({});

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

  // Fetch token metadata (symbol, name) for protected tokens
  useEffect(() => {
    if (!ark?.tokens || ark.tokens.length === 0 || !walletClient) return;

    const fetchMetadata = async () => {
      const newMetadata = { ...tokenMetadata };

      for (const tokenAddr of ark.tokens) {
        // Skip if already cached
        if (newMetadata[tokenAddr.toLowerCase()]) continue;

        try {
          // Fetch symbol using raw eth_call
          const symbolData = await walletClient.request({
            method: 'eth_call',
            params: [{
              to: tokenAddr,
              data: '0x95d89b41', // symbol() function selector
            }, 'latest'],
          });

          // Fetch name using raw eth_call
          const nameData = await walletClient.request({
            method: 'eth_call',
            params: [{
              to: tokenAddr,
              data: '0x06fdde03', // name() function selector
            }, 'latest'],
          });

          // Decode ABI-encoded string results
          const decodeString = (data) => {
            if (!data || data === '0x' || data.length < 66) return null;
            try {
              // Get the offset (first 32 bytes)
              const offset = parseInt(data.slice(2, 66), 16);
              // Get the length (next 32 bytes after offset)
              const lengthStart = 2 + offset * 2;
              const length = parseInt(data.slice(lengthStart, lengthStart + 64), 16);
              // Get the actual string data
              const stringStart = lengthStart + 64;
              const stringHex = data.slice(stringStart, stringStart + length * 2);
              // Convert hex to string
              let result = '';
              for (let i = 0; i < stringHex.length; i += 2) {
                result += String.fromCharCode(parseInt(stringHex.slice(i, i + 2), 16));
              }
              return result;
            } catch {
              return null;
            }
          };

          const symbol = decodeString(symbolData) || tokenAddr.slice(0, 6);
          const name = decodeString(nameData) || 'Unknown Token';

          newMetadata[tokenAddr.toLowerCase()] = { symbol, name };
        } catch (err) {
          console.error('Error fetching token metadata:', err);
          newMetadata[tokenAddr.toLowerCase()] = {
            symbol: tokenAddr.slice(0, 6),
            name: 'Unknown Token',
          };
        }
      }

      setTokenMetadata(newMetadata);
    };

    fetchMetadata();
  }, [ark?.tokens, walletClient]);

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
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl -m-4 md:-m-6 p-4 md:p-6">
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-2xl p-5 ${timeRemaining.urgent ? 'bg-gradient-to-br from-red-50 to-orange-50 border border-red-200' : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Time Until Deadline</div>
            <div className={`text-xl font-bold ${timeRemaining.urgent ? 'text-red-600' : 'text-green-600'}`}>
              {timeRemaining.text}
            </div>
            {timeRemaining.urgent && (
              <p className="text-xs text-red-500 mt-1">Ping soon to extend your deadline</p>
            )}
          </div>
          <button
            onClick={handlePing}
            disabled={isPinging || isPingConfirming}
            className={`group relative px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all transform hover:scale-105 active:scale-100 ${
              timeRemaining.urgent
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/30'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30'
            } disabled:opacity-50 disabled:transform-none disabled:shadow-none`}
          >
            <span className="flex items-center gap-2">
              {isPinging || isPingConfirming ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              )}
              {isPinging ? 'Confirm in Wallet...' : isPingConfirming ? 'Pinging...' : 'Ping Ark'}
            </span>
          </button>
        </div>
        {isPingSuccess && (
          <div className="mt-3 text-sm text-green-600 bg-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Ark pinged successfully! Deadline extended.
          </div>
        )}
      </div>

      {/* Ark Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Ark Details</h3>

        {/* Beneficiary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 mb-1">Beneficiary</div>
              <div className="font-mono text-sm text-slate-700 break-all bg-white/60 rounded-lg px-3 py-2 border border-slate-100">
                {ark.beneficiary}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 ml-13">
            This address will receive your tokens if the deadline passes
          </p>
        </div>

        {/* Duration */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Deadline Duration</div>
                <div className="text-base font-semibold text-slate-700">
                  {formatDuration(ark.deadlineDuration)}
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({Math.floor(Number(ark.deadlineDuration) / 60)} minutes)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditingDuration(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-500 hover:text-white bg-indigo-50 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 border border-indigo-200 hover:border-transparent rounded-lg transition-all transform hover:scale-105 active:scale-100 hover:shadow-md hover:shadow-indigo-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          </div>
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
            <div className="text-center py-6 text-sm text-slate-400 bg-slate-50/50 rounded-xl">
              No tokens protected yet.
            </div>
          ) : (
            ark.tokens.map((tokenAddress) => {
              const isBeingRemoved = removingToken === tokenAddress && (isRemoving || isRemoveConfirming);
              return (
                <div
                  key={tokenAddress}
                  className={`group flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all ${isBeingRemoved ? 'opacity-60 scale-98' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-bold text-indigo-500 shadow-sm flex-shrink-0">
                      {tokenMetadata[tokenAddress.toLowerCase()]?.symbol?.charAt(0) || tokenAddress.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700">
                        {tokenMetadata[tokenAddress.toLowerCase()]?.symbol || 'Token'}
                        <span className="text-xs text-slate-400 ml-2">
                          {tokenMetadata[tokenAddress.toLowerCase()]?.name || 'Protected Token'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        {tokenAddress}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveToken(tokenAddress)}
                    disabled={isRemoving || isRemoveConfirming}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all transform active:scale-100 ${
                      isBeingRemoved
                        ? 'text-white bg-gradient-to-r from-red-500 to-orange-500 border-transparent shadow-md shadow-red-500/20 cursor-wait'
                        : 'text-red-500 hover:text-white bg-red-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-orange-500 border border-red-200 hover:border-transparent hover:scale-105 hover:shadow-md hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                    }`}
                  >
                    {isBeingRemoved ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Removing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </>
                    )}
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
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 text-lg">
                💣
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-1">Destroy Your Ark?</h4>
                <p className="text-sm text-red-600/80">
                  This will permanently deactivate your dead man's switch. All protected tokens will be removed. You can create a new Ark afterward.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDestroyArk}
                disabled={isDestroying || isDestroyConfirming}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-500/30 transition-all transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {isDestroying || isDestroyConfirming ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isDestroying ? 'Confirm in Wallet...' : 'Destroying...'}
                  </>
                ) : (
                  <>
                    <span>💣</span>
                    Yes, Destroy Ark
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDestroyConfirm(false)}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl border border-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDestroyConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:text-white bg-red-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-orange-500 border border-red-200 hover:border-transparent rounded-xl transition-all transform hover:scale-105 active:scale-100 hover:shadow-lg hover:shadow-red-500/25"
          >
            <span>💣</span>
            Destroy Ark
          </button>
        )}
      </div>

      {/* Add Token Modal */}
      {showAddTokenModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred backdrop with rounded edges (clipped by parent) */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl"
            onClick={() => {
              setShowAddTokenModal(false);
              setSelectedTokensToAdd([]);
              setCustomTokens([]);
              setCustomTokenAddress('');
              setCustomTokenError('');
              setTokenAllowances({});
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Add Tokens</h3>
                  <p className="text-xs text-slate-400">Select tokens to protect</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddTokenModal(false);
                  setSelectedTokensToAdd([]);
                  setCustomTokens([]);
                  setCustomTokenAddress('');
                  setCustomTokenError('');
                  setTokenAllowances({});
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {/* Available tokens from wallet */}
              {availableTokens.map((token) => (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => toggleTokenToAdd(token.address)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] ${
                    selectedTokensToAdd.includes(token.address)
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-400 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                      selectedTokensToAdd.includes(token.address)
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                        : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600'
                    }`}>
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-700">{token.symbol}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">
                        {parseFloat(token.balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-400">Balance</div>
                    </div>
                    {selectedTokensToAdd.includes(token.address) && (
                      <div className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        tokenAllowances[token.address]
                          ? 'bg-green-100 text-green-600'
                          : isCheckingAllowances
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {tokenAllowances[token.address] ? '✓ Approved' :
                         isCheckingAllowances ? '...' :
                         'Needs Approval'}
                      </div>
                    )}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectedTokensToAdd.includes(token.address)
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedTokensToAdd.includes(token.address) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] ${
                    selectedTokensToAdd.includes(token.address)
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400 shadow-md shadow-purple-500/10'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                      selectedTokensToAdd.includes(token.address)
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600'
                    }`}>
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-700">
                        {token.symbol}
                        <span className="ml-2 text-xs font-normal text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded">custom</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">
                        {token.balance}
                      </div>
                      <div className="text-xs text-slate-400">Balance</div>
                    </div>
                    {selectedTokensToAdd.includes(token.address) && (
                      <div className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        tokenAllowances[token.address]
                          ? 'bg-green-100 text-green-600'
                          : isCheckingAllowances
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {tokenAllowances[token.address] ? '✓ Approved' :
                         isCheckingAllowances ? '...' :
                         'Needs Approval'}
                      </div>
                    )}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectedTokensToAdd.includes(token.address)
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedTokensToAdd.includes(token.address) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Custom Token Input - as a list item */}
              <div className={`w-full p-3 rounded-xl transition-all bg-gradient-to-r from-slate-50 to-slate-100/50 border-2 ${
                customTokenAddress ? 'border-purple-300 shadow-sm' : 'border-dashed border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    customTokenAddress
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
                      : 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={customTokenAddress}
                      onChange={(e) => {
                        setCustomTokenAddress(e.target.value);
                        setCustomTokenError('');
                      }}
                      placeholder="Paste custom token address..."
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-mono text-slate-700 placeholder:text-slate-400 transition-all"
                    />
                    {customTokenAddress && (
                      <button
                        type="button"
                        onClick={addCustomTokenToList}
                        disabled={isLoadingCustomToken}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold shadow-md shadow-purple-500/25 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-100"
                      >
                        {isLoadingCustomToken ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Loading
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {customTokenError && (
                  <div className="flex items-center gap-2 mt-2 ml-13 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {customTokenError}
                  </div>
                )}
              </div>
            </div>
            {/* Approval section */}
            {selectedTokensToAdd.length > 0 && tokensNeedingApproval.length > 0 && !isCheckingAllowances && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-700">
                      {tokensNeedingApproval.length} token{tokensNeedingApproval.length !== 1 ? 's need' : ' needs'} approval
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {supportsBatching
                        ? 'All approvals will be bundled into one transaction'
                        : 'Each token will require a separate signature'}
                    </p>
                  </div>
                  {supportsBatching && (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-lg shadow-sm">
                      ⚡ Batched
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleAddTokens}
              disabled={selectedTokensToAdd.length === 0 || isAdding || isAddConfirming || isBatchPending || isBatchConfirming || showApprovalModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none"
            >
              {isAdding || isBatchPending || isAddConfirming || isBatchConfirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isAdding || isBatchPending ? 'Confirm in Wallet...' : 'Adding Tokens...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {tokensNeedingApproval.length > 0
                    ? (supportsBatching
                        ? `Approve & Add (${tokensNeedingApproval.length + 1} txs bundled)`
                        : `Approve & Add ${selectedTokensToAdd.length} Token${selectedTokensToAdd.length !== 1 ? 's' : ''}`)
                    : `Add ${selectedTokensToAdd.length} Token${selectedTokensToAdd.length !== 1 ? 's' : ''}`}
                </>
              )}
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

      {/* Edit Duration Modal */}
      {isEditingDuration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred backdrop with rounded edges */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl md:rounded-3xl"
            onClick={() => {
              setIsEditingDuration(false);
              setNewDurationMinutes('');
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Edit Duration</h3>
                  <p className="text-xs text-slate-400">Set a new deadline duration</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditingDuration(false);
                  setNewDurationMinutes('');
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Duration Display */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-100 mb-4">
              <div className="text-xs text-slate-500 mb-1">Current Duration</div>
              <div className="text-lg font-semibold text-slate-700">
                {formatDuration(ark.deadlineDuration)}
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({Math.floor(Number(ark.deadlineDuration) / 60)} minutes)
                </span>
              </div>
            </div>

            {/* New Duration Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-2">New Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={newDurationMinutes}
                onChange={(e) => setNewDurationMinutes(e.target.value)}
                placeholder="Enter minutes..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {newDurationMinutes && parseInt(newDurationMinutes, 10) > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  This equals {formatDuration(parseInt(newDurationMinutes, 10) * 60)}
                </p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                handleUpdateDuration();
              }}
              disabled={!newDurationMinutes || parseInt(newDurationMinutes, 10) <= 0 || isUpdating || isUpdateConfirming}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none"
            >
              {isUpdating || isUpdateConfirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isUpdating ? 'Confirm in Wallet...' : 'Updating...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Update Duration
                </>
              )}
            </button>
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
    </div>
  );
}

export default ManageTab;
