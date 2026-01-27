import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { NOAH_ADDRESS, NOAH_ABI, MOCK_USDC_ADDRESS, ERC20_ABI } from '../../contracts/noah';

const durationOptions = [
  { value: 604800, label: '1 Week' },
  { value: 2592000, label: '30 Days' },
  { value: 7776000, label: '90 Days' },
  { value: 31536000, label: '1 Year' },
  { value: 63072000, label: '2 Years' },
];

function CreateTab() {
  const { address, isConnected } = useAccount();
  const [beneficiary, setBeneficiary] = useState('');
  const [duration, setDuration] = useState(2592000);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [customTokenError, setCustomTokenError] = useState('');
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);

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

  // Contract write
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
      // Add the token with placeholder data - balance will be fetched on-chain when needed
      const newToken = {
        address: trimmedAddress,
        symbol: 'CUSTOM',
        balance: '—',
        usdValue: 0,
        isCustom: true,
      };

      setTokens(prev => [...prev, newToken]);
      setSelectedTokens(prev => [...prev, trimmedAddress]);
      setCustomTokenAddress('');
    } catch (err) {
      setCustomTokenError('Failed to add token');
    } finally {
      setIsLoadingCustomToken(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!beneficiary || selectedTokens.length === 0) return;

    writeContract({
      address: NOAH_ADDRESS,
      abi: NOAH_ABI,
      functionName: 'buildArk',
      args: [beneficiary, BigInt(duration), selectedTokens],
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

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-base md:text-lg font-semibold text-green-600 mb-2">
          Ark Created Successfully!
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Your dead man's switch is now active.
        </p>
        <p className="text-xs text-slate-400 font-mono break-all">
          Tx: {hash}
        </p>
      </div>
    );
  }

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
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">
            Error: {error.shortMessage || error.message}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!beneficiary || selectedTokens.length === 0 || isPending || isConfirming}
        className="w-full solid-btn px-6 py-4 rounded-2xl font-semibold text-indigo-600 text-base shadow-lg shadow-indigo-400/45 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating Ark...' : 'Build Your Ark'}
      </button>
    </form>
  );
}

export default CreateTab;
