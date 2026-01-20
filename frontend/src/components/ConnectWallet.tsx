'use client'

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })

  if (isConnected) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-gray-900 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-green-400 text-sm font-medium">Connected</span>
          <span className="text-gray-400 text-sm">{chain?.name}</span>
        </div>

        <div className="space-y-2">
          <p className="text-gray-300 text-sm">Address</p>
          <p className="font-mono text-white bg-gray-800 p-3 rounded-lg text-sm break-all">
            {address}
          </p>
        </div>

        {balance && (
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">Balance</p>
            <p className="font-mono text-white text-xl">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          </div>
        )}

        <button
          onClick={() => disconnect()}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-6 bg-gray-900 rounded-xl border border-gray-700">
      <h2 className="text-white text-lg font-semibold mb-2">Connect Wallet</h2>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Connecting...' : connector.name}
        </button>
      ))}
    </div>
  )
}
