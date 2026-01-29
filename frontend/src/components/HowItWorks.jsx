import React from 'react';
import Step from './Step';

const setupSteps = [
  { num: '1', title: 'Configure Your Ark', desc: 'Identify which tokens you want protected and set your beneficiary'},
  { num: '2', title: 'Build your Ark', desc: 'Build your Ark on chain and approve future token transfer'},
  { num: '3', title: 'Keep Using Your Wallet', desc: 'Ping your Ark to keep it active', footnote: '*Coming soon: bundled pings for automatic protection' },
];

const protectionSteps = [
  { num: '1', title: 'Damage Detection', desc: 'Noah identifies damage through deadman switch activation' },
  { num: '2', title: 'Token Liquidation', desc: '', footnote: '*Coming soon: Third parties liquidate to a desired token (e.g. USDC) through a dutch auction' },
  { num: '3', title: 'Token Delivery', desc: 'Incentivized participants transfer your tokens to your beneficiary' },
];

function HowItWorks() {
  return (
    <div className="glass rounded-2xl p-4 md:p-6 hidden min-[1700px]:block">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-700">How It Works</h3>

      {/* Setup Flow */}
      <div className="flex items-stretch gap-2 md:gap-3">
        {setupSteps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} />
            {index < setupSteps.length - 1 && (
              <div className="flex items-center">
                <span className="text-slate-400 text-base md:text-xl hidden sm:block">→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Connecting Arrow from "Keep Using" to "Damage Detected" */}
      <div className="relative my-4 md:my-6 h-16 md:h-20">
        {/* SVG curved arrow */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
            </marker>
          </defs>
          <path
            d="M 83% 0 Q 83% 50%, 50% 50% Q 17% 50%, 17% 100%"
            stroke="#f87171"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 4"
            markerEnd="url(#arrowhead)"
          />
        </svg>
        {/* Condition label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="glass-dark rounded-full px-3 py-1.5 md:px-4 md:py-2 border border-red-300/50 whitespace-nowrap">
            <span className="text-[10px] md:text-xs font-medium text-red-500">If you or your hardware are damaged</span>
          </div>
        </div>
      </div>

      {/* Protection Flow */}
      <div className="flex items-stretch gap-2 md:gap-3">
        {protectionSteps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} variant="protection" />
            {index < protectionSteps.length - 1 && (
              <div className="flex items-center">
                <span className="text-slate-400 text-base md:text-xl hidden sm:block">→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default HowItWorks;
