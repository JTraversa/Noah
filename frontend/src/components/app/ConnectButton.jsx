import React, { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 glass-btn px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-slate-600"
        >
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-lg overflow-hidden z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-200/50">
                Connected
              </div>
              <button
                onClick={() => {
                  disconnect();
                  setIsOpen(false);
                }}
                className="w-full mt-1 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const connector = connectors.find(c => c.id === 'injected') || connectors[0];
        if (connector) connect({ connector });
      }}
      disabled={isPending}
      className="solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-400/45 disabled:opacity-50"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export default ConnectButton;
