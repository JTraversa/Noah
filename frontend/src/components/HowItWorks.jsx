import React from 'react';
import Step from './Step';

const setupSteps = [
  { num: '1', title: 'Configure Your Ark', desc: [
    'Identify which tokens you want protected',
    'Set your beneficiary wallet',
    'Set deadman switch timeout length'
  ]},
  { num: '2', title: 'Build your Ark', desc: ['Build your Ark on chain','Approve the movement of tokens under your configured conditions'] },
  { num: '3', title: 'Keep Using Your Wallet', desc: ['Ping your Ark on occasion to keep it active', '(COMING SOON) Continue using your wallet normally'] },
];

const protectionSteps = [
  { num: '1', title: 'Damage Detected', desc: 'Noah detects damage after deadman switch is activated' },
  { num: '2', title: 'MEV Transfer', desc: 'Tokens are transferred by incentivized third parties through MEV' },
  { num: '3', title: 'Tokens Delivered', desc: 'Your beneficiary receives your tokens' },
];

function HowItWorks() {
  return (
    <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-700">How It Works</h3>

      {/* Setup Flow */}
      <div className="flex items-center gap-2 md:gap-3">
        {setupSteps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} />
            {index < setupSteps.length - 1 && (
              <div className="text-slate-400 text-base md:text-xl hidden sm:block">→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Connecting Arrow with Damage Condition */}
      <div className="flex items-center justify-center my-4 md:my-5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
        <div className="flex flex-col items-center mx-3 md:mx-4">
          <div className="text-red-400 text-lg md:text-xl mb-1">↓</div>
          <div className="glass-dark rounded-full px-3 py-1.5 md:px-4 md:py-2 border border-red-300/50">
            <span className="text-[10px] md:text-xs font-medium text-red-500">If you or your hardware are damaged</span>
          </div>
          <div className="text-red-400 text-lg md:text-xl mt-1">↓</div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent"></div>
      </div>

      {/* Protection Flow */}
      <div className="flex items-center gap-2 md:gap-3">
        {protectionSteps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} variant="protection" />
            {index < protectionSteps.length - 1 && (
              <div className="text-slate-400 text-base md:text-xl hidden sm:block">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default HowItWorks;
