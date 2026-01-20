import { ConnectWallet } from "@/components/ConnectWallet";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2">
            Noah V4
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Uniswap V4 Integration - ETHNYC 2025
          </p>

          <ConnectWallet />

          <div className="mt-8 p-4 bg-gray-900 rounded-xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Local Development</h3>
            <p className="text-xs text-gray-500">
              Anvil running at http://127.0.0.1:8545 (Chain ID: 31337)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
