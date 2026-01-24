import React from 'react';

// Mock activity data - will be replaced with real event data
const mockActivity = [
  {
    id: 1,
    type: 'ping',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    txHash: '0xabc123...def456',
    details: 'Deadline extended to Jan 15, 2025',
  },
  {
    id: 2,
    type: 'add_token',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    txHash: '0xdef456...ghi789',
    details: 'Added ARB to protected tokens',
  },
  {
    id: 3,
    type: 'ping',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    txHash: '0xghi789...jkl012',
    details: 'Deadline extended to Jan 13, 2025',
  },
  {
    id: 4,
    type: 'create',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
    txHash: '0xjkl012...mno345',
    details: 'Ark created with 2 tokens',
  },
];

const eventIcons = {
  create: '🚢',
  ping: '📡',
  add_token: '➕',
  remove_token: '➖',
  flood: '🌊',
  update_duration: '⏱️',
};

const eventLabels = {
  create: 'Ark Created',
  ping: 'Ark Pinged',
  add_token: 'Token Added',
  remove_token: 'Token Removed',
  flood: 'Flood Triggered',
  update_duration: 'Duration Updated',
};

function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function ActivityTab() {
  if (mockActivity.length === 0) {
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
        {mockActivity.map((event, index) => (
          <div key={event.id} className="relative">
            {/* Timeline connector */}
            {index < mockActivity.length - 1 && (
              <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-200 -mb-3"></div>
            )}

            <div className="flex gap-3">
              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                {eventIcons[event.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-700">
                    {eventLabels[event.type]}
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{event.details}</div>
                <a
                  href={`https://arbiscan.io/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-500 hover:text-indigo-600 font-mono mt-1 inline-block"
                >
                  {event.txHash}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <button className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        Load More
      </button>
    </div>
  );
}

export default ActivityTab;
