import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useChainId } from 'wagmi';
import { useWriteContracts, useCallsStatus, useCapabilities } from 'wagmi/experimental';
import { formatUnits, maxUint256 } from 'viem';
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

  // Sequential approval state (fallback for wallets without batching)
  const [isApprovingSequentially, setIsApprovingSequentially] = useState(false);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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
    query: { enabled: !!batchId, refetchInterval: 1000 },
  });

  const isBatchConfirming = callsStatus?.status === 'PENDING';
  const isBatchSuccess = callsStatus?.status === 'CONFIRMED';

  // Wait for transaction (for non-batched flow - both approvals and ark creation)
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
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

  // Sequential approval flow (for EOA wallets)
  const startSequentialApproval = () => {
    if (tokensNeedingApproval.length === 0) return;
    setIsApprovingSequentially(true);
    setCurrentApprovalIndex(0);
    setShowApprovalModal(true);
    // Start first approval
    writeContract({
      address: tokensNeedingApproval[0],
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [NOAH_ADDRESS, maxUint256],
    });
  };

  // Handle sequential approval success - move to next or finish
  useEffect(() => {
    if (!isApprovingSequentially || !isSuccess) return;

    const approveNext = async () => {
      // Update allowance for the token we just approved
      const justApproved = tokensNeedingApproval[currentApprovalIndex];
      if (justApproved) {
        setTokenAllowances(prev => ({ ...prev, [justApproved]: true }));
      }

      const nextIndex = currentApprovalIndex + 1;

      if (nextIndex < tokensNeedingApproval.length) {
        // More tokens to approve
        setCurrentApprovalIndex(nextIndex);
        resetWrite();
        // Small delay to let state update
        setTimeout(() => {
          writeContract({
            address: tokensNeedingApproval[nextIndex],
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [NOAH_ADDRESS, maxUint256],
          });
        }, 500);
      } else {
        // All approvals done, close modal and re-check allowances
        setShowApprovalModal(false);
        setIsApprovingSequentially(false);
        setCurrentApprovalIndex(0);
        resetWrite();
        await checkAllApprovals();
      }
    };

    approveNext();
  }, [isSuccess, isApprovingSequentially]);

  // Show modal when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      setCreationConfirmedOnChain(true);
      setShowCreationPendingModal(true);
    }
  }, [isSuccess]);

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
        // EOA wallet - need sequential approvals first
        startSequentialApproval();
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
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🔗</div>
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
    {/* Sequential Approval Progress Modal */}
    {showApprovalModal && isApprovingSequentially && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Approving Tokens ({currentApprovalIndex + 1}/{tokensNeedingApproval.length})
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Approve Noah to transfer your tokens when your conditions trigger
            </p>

            {/* Token approval list */}
            <div className="space-y-2 mb-4">
              {tokensNeedingApproval.map((addr, idx) => {
                const token = tokens.find(t => t.address === addr);
                const isCompleted = idx < currentApprovalIndex || tokenAllowances[addr];
                const isCurrent = idx === currentApprovalIndex;
                return (
                  <div key={addr} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">
                      {token?.symbol || addr.slice(0, 8)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isCompleted ? 'bg-green-100 text-green-600' :
                      isCurrent ? 'bg-yellow-100 text-yellow-600 animate-pulse' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? '✓ Done' :
                       isCurrent ? (isPending ? 'Confirm...' : isConfirming ? 'Confirming...' : 'Approving...') :
                       'Waiting'}
                    </span>
                  </div>
                );
              })}
            </div>

            {(isPending || isConfirming) && (
              <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg p-3">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{isPending ? 'Confirm in wallet...' : 'Waiting for confirmation...'}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-3">
                <p className="text-xs text-red-600">
                  {error.shortMessage || error.message}
                </p>
                <button
                  onClick={() => {
                    resetWrite();
                    writeContract({
                      address: tokensNeedingApproval[currentApprovalIndex],
                      abi: ERC20_ABI,
                      functionName: 'approve',
                      args: [NOAH_ADDRESS, maxUint256],
                    });
                  }}
                  className="mt-2 text-xs text-red-600 underline"
                >
                  Try again
                </button>
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
          {tokens.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => toggleToken(token.address)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                selectedTokens.includes(token.address)
                  ? 'bg-indigo-50 border-2 border-indigo-400'
                  : 'bg-slate-50/50 border-2 border-transparent hover:bg-slate-100'
              } ${token.usdValue <= 1 && !token.isCustom ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  token.isCustom ? 'bg-purple-200 text-purple-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {token.isCustom ? '?' : token.symbol.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-700">
                    {token.symbol}
                    {token.isCustom && <span className="ml-1 text-xs text-purple-500">(custom)</span>}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">{token.balance}</div>
                  {!token.isCustom && (
                    <div className="text-xs text-slate-400">
                      ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
                {/* Approval status indicator */}
                {selectedTokens.includes(token.address) && (
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
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

          {/* Custom Token Input - as a list item */}
          <div className={`w-full p-3 rounded-xl transition-all bg-slate-50/50 border-2 ${
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
                    onClick={addCustomToken}
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
        <p className="text-xs text-slate-400 mt-1">
          {selectedTokens.length} token{selectedTokens.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Error Display */}
      {(error || batchError) && !isApprovingSequentially && (
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
        disabled={!beneficiary || selectedTokens.length === 0 || isPending || isConfirming || isBatchPending || isBatchConfirming || isApprovingSequentially}
        className="w-full solid-btn px-6 py-4 rounded-2xl font-semibold text-indigo-600 text-base shadow-lg shadow-indigo-400/45 disabled:opacity-50 disabled:cursor-not-allowed"
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
