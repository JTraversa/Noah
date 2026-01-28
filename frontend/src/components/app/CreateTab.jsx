import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useChainId, useWalletClient } from 'wagmi';
import { useWriteContracts, useCallsStatus, useCapabilities } from 'wagmi/experimental';
import { formatUnits, maxUint256, encodeFunctionData } from 'viem';
import { NOAH_ADDRESS, NOAH_ABI, MOCK_USDC_ADDRESS, ERC20_ABI } from '../../contracts/noah';
import { refreshActivity } from './ActivityTab';

const API_BASE_URL = 'https://noah-backend.fly.dev';

const durationOptions = [
  { value: 604800, label: '1 Week' },
  { value: 2592000, label: '30 Days' },
  { value: 7776000, label: '90 Days' },
  { value: 31536000, label: '1 Year' },
  { value: 63072000, label: '2 Years' },
];

function CreateTab({ onArkCreated }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [beneficiary, setBeneficiary] = useState('');
  const [duration, setDuration] = useState(2592000);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [customTokenError, setCustomTokenError] = useState('');
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);
  const [showCreationPendingModal, setShowCreationPendingModal] = useState(false);
  const [creationConfirmedOnChain, setCreationConfirmedOnChain] = useState(false);

  // Approval state
  const [tokenAllowances, setTokenAllowances] = useState({}); // { tokenAddress: boolean }
  const [isCheckingAllowances, setIsCheckingAllowances] = useState(false);

  // Parallel approval state (fallback for wallets without batching)
  // approvalTxs: [{ token: address, hash: txHash, status: 'pending' | 'signing' | 'confirming' | 'confirmed' | 'error', error?: string }]
  const [approvalTxs, setApprovalTxs] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isSigningApprovals, setIsSigningApprovals] = useState(false);
  const approvalPollingRef = useRef(null);

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  // Check if user already has an ark
  const { data: existingArk } = useReadContract({
    address: NOAH_ADDRESS,
    abi: NOAH_ABI,
    functionName: 'getArk',
    args: [address],
    enabled: !!address,
  });

  const hasExistingArk = existingArk && existingArk[1] > 0n; // deadline > 0

  // Build token list from wallet
  useEffect(() => {
    if (address && usdcBalance !== undefined) {
      const balance = formatUnits(usdcBalance, 6);
      const usdValue = parseFloat(balance);
      setTokens([
        {
          address: MOCK_USDC_ADDRESS,
          symbol: 'USDC',
          balance: parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          usdValue,
        },
      ]);
    }
  }, [address, usdcBalance]);

  // Check wallet capabilities (EIP-5792 support)
  const { data: capabilities } = useCapabilities();

  // Check if wallet supports atomic batching
  const supportsBatching = useMemo(() => {
    if (!capabilities || !chainId) return false;
    const chainCaps = capabilities[chainId];
    // Check for atomicBatch capability (EIP-5792)
    return chainCaps?.atomicBatch?.supported === true;
  }, [capabilities, chainId]);

  // Contract write for building ark
  const { data: hash, writeContract, isPending, error, reset: resetWrite } = useWriteContract();

  // Batched writes for approvals + ark creation (EIP-5792)
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

  // Wait for transaction (for non-batched flow - both approvals and ark creation)
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { refetchInterval: 500 }, // Poll every 1 second for faster confirmation
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

  // Check approvals for all selected tokens
  const checkAllApprovals = useCallback(async () => {
    if (!address || selectedTokens.length === 0) {
      setTokenAllowances({});
      return;
    }

    setIsCheckingAllowances(true);
    const allowances = {};

    for (const tokenAddr of selectedTokens) {
      allowances[tokenAddr] = await checkAllowance(tokenAddr);
    }

    setTokenAllowances(allowances);
    setIsCheckingAllowances(false);
  }, [address, selectedTokens, checkAllowance]);

  // Check approvals when selected tokens change
  useEffect(() => {
    checkAllApprovals();
  }, [selectedTokens, checkAllApprovals]);

  // Re-check allowances after batch success
  useEffect(() => {
    if (isBatchSuccess) {
      checkAllApprovals();
    }
  }, [isBatchSuccess, checkAllApprovals]);

  // Get tokens that need approval
  const tokensNeedingApproval = selectedTokens.filter(addr => !tokenAllowances[addr]);

  // Check if all selected tokens are approved
  const allTokensApproved = selectedTokens.length > 0 &&
    selectedTokens.every(addr => tokenAllowances[addr] === true);

  // Batched approve and create ark (for smart wallets)
  const handleBatchedApproveAndCreate = () => {
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

    // Add the buildArk call
    contracts.push({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'buildArk',
      args: [beneficiary, BigInt(duration), selectedTokens],
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

  // Show modal when ark creation transaction is confirmed (not approvals)
  useEffect(() => {
    if (isSuccess && !showApprovalModal) {
      setCreationConfirmedOnChain(true);
      setShowCreationPendingModal(true);
    }
  }, [isSuccess, showApprovalModal]);

  // Poll API to check if ark has been created
  useEffect(() => {
    if (!creationConfirmedOnChain || !address) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/arks/${address}`);
        const data = await response.json();

        // If ark found for this address on current chain, creation is complete
        if (data && Array.isArray(data) && data.some(ark => ark.chain_id === chainId)) {
          setShowCreationPendingModal(false);
          setCreationConfirmedOnChain(false);
          clearInterval(pollInterval);
          // Refresh activity cache
          refreshActivity(address, chainId);
          onArkCreated?.(); // Trigger parent to refetch and show ManageTab
        }
      } catch (err) {
        console.error('Error polling API:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [creationConfirmedOnChain, address, chainId, onArkCreated]);

  const toggleToken = (addr) => {
    setSelectedTokens((prev) =>
      prev.includes(addr)
        ? prev.filter((a) => a !== addr)
        : [...prev, addr]
    );
  };

  const selectAllTokens = () => {
    const eligibleTokens = tokens.filter((t) => t.usdValue > 1);
    setSelectedTokens(eligibleTokens.map((t) => t.address));
  };

  const isValidAddress = (addr) => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const addCustomToken = async () => {
    const trimmedAddress = customTokenAddress.trim();

    if (!isValidAddress(trimmedAddress)) {
      setCustomTokenError('Invalid address format');
      return;
    }

    if (tokens.some(t => t.address.toLowerCase() === trimmedAddress.toLowerCase())) {
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
        usdValue: 0, // We don't have price data for custom tokens
        isCustom: true,
      };

      setTokens(prev => [...prev, newToken]);
      setSelectedTokens(prev => [...prev, trimmedAddress]);
      setCustomTokenAddress('');
    } catch (err) {
      console.error('Failed to fetch token data:', err);
      setCustomTokenError('Failed to fetch token data. Is this a valid ERC20 token?');
    } finally {
      setIsLoadingCustomToken(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!beneficiary || selectedTokens.length === 0) return;

    if (tokensNeedingApproval.length > 0) {
      if (supportsBatching) {
        // Smart wallet - batch all approvals + create in one tx
        handleBatchedApproveAndCreate();
      } else {
        // EOA wallet - send all approvals at once, wait for confirmations
        startParallelApprovals();
      }
    } else {
      // All tokens approved, just create ark
      writeContract({
        address: NOAH_ADDRESS,
        abi: NOAH_ABI,
        functionName: 'buildArk',
        args: [beneficiary, BigInt(duration), selectedTokens],
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl shadow-inner">
          🔗
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-slate-500">
          Connect your wallet to create an Ark.
        </p>
      </div>
    );
  }

  if (hasExistingArk) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🚢</div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          Ark Already Exists
        </h3>
        <p className="text-sm text-slate-500">
          You already have an active Ark. Go to the Manage tab to view or modify it.
        </p>
      </div>
    );
  }

  return (
    <>
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
                const token = tokens.find(t => t.address === tx.token);
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

    {/* Creation Pending Modal */}
    {showCreationPendingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setShowCreationPendingModal(false)}
        />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <button
            onClick={() => setShowCreationPendingModal(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <span className="text-xl">&times;</span>
          </button>

          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🚢</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Building Your Ark
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Your transaction has been confirmed on-chain. Waiting for the indexer to process your new Ark...
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg p-3">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing creation...</span>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Tx: <span className="font-mono">{hash?.slice(0, 10)}...{hash?.slice(-8)}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              You can close this modal. The page will update automatically once complete.
            </p>
          </div>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Beneficiary Input */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Beneficiary Address
          </label>
        </div>
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
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Deadline Duration
          </label>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {durationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDuration(opt.value);
                setIsCustomDuration(false);
                setCustomMinutes('');
              }}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                duration === opt.value && !isCustomDuration
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-50/50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustomDuration(true)}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
              isCustomDuration
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-50/50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Custom
          </button>
        </div>
        {isCustomDuration && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                const mins = parseInt(e.target.value, 10);
                if (mins > 0) {
                  setDuration(mins * 60);
                }
              }}
              placeholder="Enter minutes"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
            />
            <span className="text-sm text-slate-500">minutes</span>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-1">
          How long before your Ark can be triggered after your last ping
          {isCustomDuration && customMinutes && parseInt(customMinutes, 10) > 0 && (
            <span className="text-indigo-500"> ({Math.floor(duration / 60)} min = {duration} seconds)</span>
          )}
        </p>
      </div>

      {/* Token Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <label className="text-sm font-semibold text-slate-700">
              Select Tokens
            </label>
          </div>
          <button
            type="button"
            onClick={selectAllTokens}
            disabled={tokens.length === 0}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
              tokens.length === 0
                ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                : 'text-indigo-500 hover:text-white bg-indigo-50 hover:bg-indigo-500 border-indigo-200 hover:border-transparent'
            }`}
            title="Selects tokens worth more than $1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select All (&gt;$1)
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {tokens.map((token) => {
            const isSelected = selectedTokens.includes(token.address);
            return (
              <button
                key={token.address}
                type="button"
                onClick={() => toggleToken(token.address)}
                className={`group w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 shadow-sm'
                    : 'bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-100 hover:border-slate-200'
                } ${token.usdValue <= 1 && !token.isCustom ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                    token.isCustom
                      ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600'
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600'
                  }`}>
                    {token.isCustom ? '?' : token.symbol.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-700">
                      {token.symbol}
                      {token.isCustom && <span className="ml-1.5 text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">(custom)</span>}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{token.balance}</div>
                    {!token.isCustom && (
                      <div className="text-xs text-slate-400">
                        ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  {/* Approval status indicator */}
                  {isSelected && (
                    <div className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
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
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30'
                      : 'border-2 border-slate-300 group-hover:border-indigo-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Custom Token Input - as a list item */}
          <div className={`w-full p-4 rounded-xl transition-all border ${
            customTokenAddress
              ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              : 'bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-sm font-bold text-purple-400 shadow-sm">
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
                  className="flex-1 px-3 py-2 rounded-lg bg-white/80 border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-mono text-slate-700 placeholder:text-slate-400 transition-all"
                />
                {customTokenAddress && (
                  <button
                    type="button"
                    onClick={addCustomToken}
                    disabled={isLoadingCustomToken}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold shadow-md shadow-purple-500/25 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-100"
                  >
                    {isLoadingCustomToken ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    Add
                  </button>
                )}
              </div>
            </div>
            {customTokenError && (
              <p className="text-xs text-red-500 mt-2 ml-13 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {customTokenError}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-semibold ${
            selectedTokens.length > 0
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {selectedTokens.length}
          </span>
          token{selectedTokens.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Error Display */}
      {(error || batchError) && !showApprovalModal && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">
            Error: {(error || batchError)?.shortMessage || (error || batchError)?.message}
          </p>
        </div>
      )}

      {/* Approval Status Summary */}
      {selectedTokens.length > 0 && tokensNeedingApproval.length > 0 && !isCheckingAllowances && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!beneficiary || selectedTokens.length === 0 || isPending || isConfirming || isBatchPending || isBatchConfirming || showApprovalModal}
        className="w-full solid-btn px-6 py-4 rounded-xl font-semibold text-indigo-600 text-base shadow-lg shadow-indigo-400/45 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending || isBatchPending ? 'Confirm in Wallet...' :
         isConfirming || isBatchConfirming ? 'Creating Ark...' :
         tokensNeedingApproval.length > 0
           ? (supportsBatching ? `Approve & Build (${tokensNeedingApproval.length + 1} txs bundled)` : `Approve ${tokensNeedingApproval.length} Token${tokensNeedingApproval.length !== 1 ? 's' : ''} & Build`)
           : 'Build Your Ark'}
      </button>
    </form>
    </>
  );
}

export default CreateTab;
