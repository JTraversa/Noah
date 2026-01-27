import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';

const API_BASE_URL = 'https://noah-backend.fly.dev';

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

function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp * 1000; // API returns seconds, convert to ms

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getEventDetails(event) {
  switch (event.event_type) {
    case 'ArkBuilt':
      return `Beneficiary: ${event.event_data.beneficiary?.slice(0, 6)}...${event.event_data.beneficiary?.slice(-4)}`;
    case 'ArkPinged':
      return `Deadline extended`;
    case 'PassengersAdded':
      const count = event.event_data.new_passengers?.length || 0;
      return `Added ${count} token${count !== 1 ? 's' : ''} to protected list`;
    case 'PassengerRemoved':
      return `Removed ${event.event_data.passenger?.slice(0, 6)}...${event.event_data.passenger?.slice(-4)}`;
    case 'FloodTriggered':
      return `Assets transferred to beneficiary`;
    case 'DeadlineUpdated':
      return `Duration updated`;
    case 'ArkDestroyed':
      return `Ark has been destroyed`;
    default:
      return '';
  }
}

function ActivityTab() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchActivity() {
      if (!address) {
        setActivity([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/activity/${address}?chain_id=${chainId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }
        const data = await response.json();
        setActivity(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching activity:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [address, chainId]);

  const explorerUrl = chainExplorers[chainId];

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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>

      <div className="space-y-3">
        {activity.map((event, index) => (
          <div key={event.id} className="relative">
            {/* Timeline connector */}
            {index < activity.length - 1 && (
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
                  {getEventDetails(event)}
                </div>
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
        ))}
      </div>
    </div>
  );
}

export default ActivityTab;
