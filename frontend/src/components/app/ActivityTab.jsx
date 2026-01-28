import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { ERC20_ABI } from '../../contracts/noah';

const API_BASE_URL = 'https://noah-backend.fly.dev';

// Cache for token symbols (persisted in memory during session)
const tokenSymbolCache = {};
const CACHE_KEY_PREFIX = 'noah_activity_';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const ITEMS_PER_PAGE = 5;

// Component to display token addresses with expand/collapse
function TokenList({ tokens, tokenSymbols, maxVisible = 3 }) {
  const [expanded, setExpanded] = useState(false);

  if (!tokens || tokens.length === 0) return null;

  const visibleTokens = expanded ? tokens : tokens.slice(0, maxVisible);
  const hiddenCount = tokens.length - maxVisible;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {visibleTokens.map((token, idx) => {
          const symbol = tokenSymbols[token.toLowerCase()];
          return (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 text-xs text-slate-600 hover:border-indigo-200 hover:from-indigo-50 hover:to-purple-50 transition-all cursor-default"
              title={token}
            >
              {symbol ? (
                <>
                  <span className="font-semibold text-slate-700">{symbol}</span>
                  <span className="text-slate-400 font-mono ml-1.5 text-[10px]">{token.slice(0, 6)}...{token.slice(-4)}</span>
                </>
              ) : (
                <span className="font-mono">{token.slice(0, 6)}...{token.slice(-4)}</span>
              )}
            </span>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-2 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

const eventIcons = {
  ArkBuilt: '🚢',
  ArkPinged: '📡',
  PassengersAdded: '➕',
  PassengerRemoved: '➖',
  FloodTriggered: '🌊',
  DeadlineUpdated: '⏱️',
  ArkDestroyed: '💥',
};

const eventColors = {
  ArkBuilt: 'from-emerald-400 to-teal-500',
  ArkPinged: 'from-green-400 to-emerald-500',
  PassengersAdded: 'from-indigo-400 to-purple-500',
  PassengerRemoved: 'from-orange-400 to-amber-500',
  FloodTriggered: 'from-blue-400 to-cyan-500',
  DeadlineUpdated: 'from-violet-400 to-purple-500',
  ArkDestroyed: 'from-red-400 to-orange-500',
};

const eventLabels = {
  ArkBuilt: 'Ark Created',
  ArkPinged: 'Ark Pinged',
  PassengersAdded: 'Tokens Added',
  PassengerRemoved: 'Token Removed',
  FloodTriggered: 'Flood Triggered',
  DeadlineUpdated: 'Duration Updated',
  ArkDestroyed: 'Ark Destroyed',
};

const chainExplorers = {
  11155111: 'https://sepolia.etherscan.io',
  42161: 'https://arbiscan.io',
  31337: null, // Local chain
};

// Helper to get cache key for address + chain
function getCacheKey(address, chainId) {
  return `${CACHE_KEY_PREFIX}${address?.toLowerCase()}_${chainId}`;
}

// Get cached activity from localStorage
function getCachedActivity(address, chainId) {
  try {
    const key = getCacheKey(address, chainId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    return { data, timestamp, isStale: Date.now() - timestamp > CACHE_DURATION_MS };
  } catch {
    return null;
  }
}

// Save activity to localStorage
function setCachedActivity(address, chainId, data) {
  try {
    const key = getCacheKey(address, chainId);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.warn('Failed to cache activity:', err);
  }
}

// Export function to refresh activity (call after transactions)
export async function refreshActivity(address, chainId) {
  if (!address) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/activity/${address}?chain_id=${chainId}`);
    if (!response.ok) throw new Error('Failed to fetch activity');
    const data = await response.json();
    setCachedActivity(address, chainId, data);

    // Dispatch custom event so ActivityTab can update
    window.dispatchEvent(new CustomEvent('noah_activity_updated', {
      detail: { address, chainId, data }
    }));

    return data;
  } catch (err) {
    console.error('Error refreshing activity:', err);
    return null;
  }
}

function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp * 1000; // API returns seconds, convert to ms

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  // Over 24 hours: show date and time
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getEventDetails(event) {
  switch (event.event_type) {
    case 'ArkBuilt':
      const beneficiary = event.event_data.beneficiary;
      const builtTokens = event.event_data.tokens || [];
      const tokenCount = builtTokens.length;
      const beneficiaryStr = beneficiary ? `${beneficiary.slice(0, 6)}...${beneficiary.slice(-4)}` : 'Unknown';
      return {
        text: tokenCount > 0
          ? `Beneficiary: ${beneficiaryStr} • ${tokenCount} token${tokenCount !== 1 ? 's' : ''} protected`
          : `Beneficiary: ${beneficiaryStr}`,
        tokens: builtTokens,
      };
    case 'ArkPinged':
      return { text: 'Deadline extended', tokens: null };
    case 'PassengersAdded':
      const addedTokens = event.event_data.new_passengers || [];
      const addCount = addedTokens.length;
      return {
        text: `Added ${addCount} token${addCount !== 1 ? 's' : ''} to protected list`,
        tokens: addedTokens,
      };
    case 'PassengerRemoved':
      const removedToken = event.event_data.passenger;
      return {
        text: 'Removed token from protected list',
        tokens: removedToken ? [removedToken] : null,
      };
    case 'FloodTriggered':
      return { text: 'Assets transferred to beneficiary', tokens: null };
    case 'DeadlineUpdated':
      return { text: 'Duration updated', tokens: null };
    case 'ArkDestroyed':
      return { text: 'Ark has been destroyed', tokens: null };
    default:
      return { text: '', tokens: null };
  }
}

function ActivityTab() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tokenSymbols, setTokenSymbols] = useState({});

  const fetchActivity = useCallback(async (showLoadingState = true, currentActivity = []) => {
    if (!address) {
      setActivity([]);
      setLoading(false);
      return;
    }

    try {
      if (showLoadingState) setRefreshing(true);
      const response = await fetch(`${API_BASE_URL}/api/activity/${address}?chain_id=${chainId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }
      const data = await response.json();
      setActivity(data);
      setCachedActivity(address, chainId, data);
      setError(null);
    } catch (err) {
      console.error('Error fetching activity:', err);
      // Only show error if we don't have cached data
      if (currentActivity.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address, chainId]);

  // Load cached data immediately for fast display, then ALWAYS fetch fresh data
  useEffect(() => {
    if (!address) {
      setActivity([]);
      setLoading(false);
      return;
    }

    // Try to load from cache first for immediate display (lazy load pattern)
    const cached = getCachedActivity(address, chainId);
    if (cached?.data) {
      setActivity(cached.data);
      setLoading(false);
      // Always fetch fresh data in background on page load/refresh
      fetchActivity(false, cached.data);
    } else {
      // No cache, show loading state and fetch fresh
      setLoading(true);
      fetchActivity(true, []);
    }
  }, [address, chainId, fetchActivity]);

  // Listen for activity update events (triggered after transactions)
  useEffect(() => {
    function handleActivityUpdate(e) {
      if (e.detail.address?.toLowerCase() === address?.toLowerCase() &&
          e.detail.chainId === chainId) {
        setActivity(e.detail.data);
        setCurrentPage(1); // Reset pagination on new data
      }
    }

    window.addEventListener('noah_activity_updated', handleActivityUpdate);
    return () => window.removeEventListener('noah_activity_updated', handleActivityUpdate);
  }, [address, chainId]);

  // Reset pagination when address or chain changes
  useEffect(() => {
    setCurrentPage(1);
  }, [address, chainId]);

  // Fetch token symbols for all tokens in activity
  useEffect(() => {
    if (activity.length === 0) return;
    if (!walletClient && !publicClient) return;

    // Collect all unique token addresses from activity
    const allTokens = new Set();
    activity.forEach(event => {
      const details = getEventDetails(event);
      if (details.tokens) {
        details.tokens.forEach(t => allTokens.add(t.toLowerCase()));
      }
    });

    // Filter out tokens we already have cached
    const tokensToFetch = [...allTokens].filter(t => !(t in tokenSymbolCache));

    if (tokensToFetch.length === 0) {
      // All tokens already cached, just update state
      setTokenSymbols({ ...tokenSymbolCache });
      return;
    }

    // Fetch symbols for new tokens
    const fetchSymbols = async () => {
      const newSymbols = { ...tokenSymbolCache };

      await Promise.all(tokensToFetch.map(async (tokenAddr) => {
        try {
          let symbol;
          // Try walletClient first (uses wallet's RPC, avoids CORS issues)
          if (walletClient) {
            const data = await walletClient.request({
              method: 'eth_call',
              params: [{
                to: tokenAddr,
                data: '0x95d89b41', // symbol() function selector
              }, 'latest'],
            });
            // Decode the string result (skip first 64 chars for offset, then parse length and string)
            if (data && data !== '0x') {
              const hex = data.slice(130); // Skip 0x + 64 chars offset + 64 chars length
              const length = parseInt(data.slice(66, 130), 16);
              symbol = '';
              for (let i = 0; i < length * 2; i += 2) {
                const charCode = parseInt(hex.slice(i, i + 2), 16);
                if (charCode) symbol += String.fromCharCode(charCode);
              }
            }
          } else if (publicClient) {
            // Fallback to publicClient
            symbol = await publicClient.readContract({
              address: tokenAddr,
              abi: ERC20_ABI,
              functionName: 'symbol',
            });
          }

          if (symbol) {
            newSymbols[tokenAddr] = symbol;
            tokenSymbolCache[tokenAddr] = symbol;
          } else {
            newSymbols[tokenAddr] = null;
            tokenSymbolCache[tokenAddr] = null;
          }
        } catch (err) {
          // Token might not have symbol function, skip it
          console.warn(`Failed to fetch symbol for ${tokenAddr}:`, err.message);
          newSymbols[tokenAddr] = null;
          tokenSymbolCache[tokenAddr] = null;
        }
      }));

      setTokenSymbols(newSymbols);
    };

    fetchSymbols();
  }, [activity, publicClient, walletClient]);

  const explorerUrl = chainExplorers[chainId];

  const handleManualRefresh = () => {
    fetchActivity(true, activity);
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
          Connect your wallet to view your Ark activity.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl animate-pulse shadow-inner">
          📋
        </div>
        <p className="text-sm text-slate-500">Loading activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center text-3xl shadow-inner">
          ⚠️
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          Error Loading Activity
        </h3>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl shadow-inner">
          📋
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          No Activity Yet
        </h3>
        <p className="text-sm text-slate-500">
          Your Ark activity will appear here once you start interacting with the contract.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(activity.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleActivity = activity.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-500 hover:text-white bg-indigo-50 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 border border-indigo-200 hover:border-transparent rounded-lg transition-all transform hover:scale-105 active:scale-100 hover:shadow-md hover:shadow-indigo-500/20 disabled:opacity-50 disabled:transform-none disabled:hover:bg-indigo-50 disabled:hover:text-indigo-500 disabled:hover:border-indigo-200"
        >
          <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div key={currentPage} className="space-y-3 tab-content-enter">
        {visibleActivity.map((event, index) => {
          const details = getEventDetails(event);
          const colorClass = eventColors[event.event_type] || 'from-slate-400 to-slate-500';
          return (
            <div key={event.id} className="relative">
              {/* Timeline connector */}
              {index < visibleActivity.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-200 -mb-3"></div>
              )}

              <div className="flex gap-3">
                {/* Icon */}
                <div className="w-8 h-8 flex items-center justify-center text-xl flex-shrink-0">
                  {eventIcons[event.event_type] || '📝'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-700">
                      {eventLabels[event.event_type] || event.event_type}
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {details.text}
                  </div>
                  {details.tokens && details.tokens.length > 0 && (
                    <TokenList tokens={details.tokens} tokenSymbols={tokenSymbols} maxVisible={3} />
                  )}
                  {explorerUrl && event.tx_hash && (
                    <a
                      href={`${explorerUrl}/tx/${event.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <span className="font-mono">{event.tx_hash.slice(0, 8)}...{event.tx_hash.slice(-6)}</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 text-sm font-medium rounded-lg transition-all ${
                page === currentPage
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityTab;
