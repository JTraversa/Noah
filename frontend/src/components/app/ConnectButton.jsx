import React from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-400/45"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-red-500 shadow-lg shadow-red-400/45"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-1 glass-btn px-2 md:px-3 py-1.5 md:py-2 rounded-full shadow-lg shadow-indigo-400/40"
                    title={chain.name}
                  >
                    {chain.hasIcon && chain.iconUrl ? (
                      <img
                        src={chain.iconUrl}
                        alt={chain.name ?? 'Chain'}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600">
                        {chain.name?.charAt(0) || '?'}
                      </span>
                    )}
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-2 solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-400/45"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-mono">
                      {account.displayName}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

export default ConnectButton;
