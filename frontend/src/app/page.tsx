export default function Home() {
  return (
    <main className="min-h-screen gradient-bg overflow-hidden">
      {/* Decorative blurred circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold gradient-text">Noah</div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
          <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
          <button className="px-6 py-2 rounded-full glass hover:bg-white/10 transition-all">
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        <div className="float">
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            <span className="gradient-text">Noah V4</span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12">
          Next-generation DeFi powered by Uniswap V4 hooks.
          Smarter swaps, better rates, infinite possibilities.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold text-lg transition-all pulse-glow">
            Get Started
          </button>
          <button className="px-8 py-4 rounded-full glass hover:bg-white/10 font-semibold text-lg transition-all">
            Learn More
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-8 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">
          <span className="gradient-text">Why Noah?</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "V4 Hooks",
              description: "Leverage Uniswap V4's powerful hook system for custom swap logic and enhanced functionality.",
              icon: "🪝"
            },
            {
              title: "Gas Optimized",
              description: "Singleton pool architecture means lower gas costs and more efficient trades for everyone.",
              icon: "⚡"
            },
            {
              title: "Flash Accounting",
              description: "Advanced settlement system that only transfers net balances, saving you money on every trade.",
              icon: "💎"
            }
          ].map((feature, i) => (
            <div key={i} className="glass rounded-2xl p-8 glow hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-5xl mx-auto glass rounded-3xl p-12 glow">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { value: "$0", label: "Total Volume" },
              { value: "0", label: "Total Trades" },
              { value: "0", label: "Active Users" }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold gradient-text">Noah</div>
          <div className="flex items-center gap-6 text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <div className="text-gray-500 text-sm">ETHNYC 2025</div>
        </div>
      </footer>
    </main>
  );
}
