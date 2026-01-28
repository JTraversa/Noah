import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
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
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1">
        {visibleTokens.map((token, idx) => {
          const symbol = tokenSymbols[token.toLowerCase()];
          return (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-xs text-slate-600"
              title={token}
            >
              {symbol ? (
                <>
                  <span className="font-medium">{symbol}</span>
                  <span className="text-slate-400 font-mono ml-1">({token.slice(0, 6)}...{token.slice(-4)})</span>
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
          className="flex items-center gap-1 mt-1 text-xs text-indigo-500 hover:text-indigo-600"
        >
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
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
    if (!publicClient || activity.length === 0) return;

    // Collect all unique token addresses from activity
    const allTokens = new Set();
    activity.forEach(event => {
      const details = getEventDetails(event);
      if (details.tokens) {
        details.tokens.forEach(t => allTokens.add(t.toLowerCase()));
      }
    });

    // Filter out tokens we already have cached
    const tokensToFetch = [...allTokens].filter(t => !tokenSymbolCache[t]);

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
          const symbol = await publicClient.readContract({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: 'symbol',
          });
          newSymbols[tokenAddr] = symbol;
          tokenSymbolCache[tokenAddr] = symbol;
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
  }, [activity, publicClient]);

  const explorerUrl = chainExplorers[chainId];

  const handleManualRefresh = () => {
    fetchActivity(true, activity);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🔗</div>
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
      <div className="text-center py-8">
        <div className="text-4xl mb-3 animate-pulse">📋</div>
        <p className="text-sm text-slate-500">Loading activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">
          Error Loading Activity
        </h3>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📋</div>
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
        <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="text-xs text-indigo-500 hover:text-indigo-600 disabled:opacity-50 flex items-center gap-1"
        >
          <span className={refreshing ? 'animate-spin' : ''}>↻</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3">
        {visibleActivity.map((event, index) => {
          const details = getEventDetails(event);
          return (
            <div key={event.id} className="relative">
              {/* Timeline connector */}
              {index < visibleActivity.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-200 -mb-3"></div>
              )}

              <div className="flex gap-3">
                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
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
                      className="text-xs text-indigo-500 hover:text-indigo-600 font-mono mt-1 inline-block"
                    >
                      {event.tx_hash.slice(0, 10)}...{event.tx_hash.slice(-8)}
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
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-7 h-7 text-sm rounded-md transition-colors ${
                page === currentPage
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityTab;
