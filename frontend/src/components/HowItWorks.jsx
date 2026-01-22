import React from 'react';
import Step from './Step';

const steps = [
  { num: '1', title: 'Configure Your Ark', desc: [
    'Identify which tokens you want protected',
    'Set your beneficiary wallet',
    'Set deadman switch timeout length'
  ]},
  { num: '2', title: 'Build your Ark', desc: ['Build your Ark on chain','Approve the movement of tokens under your configured conditions'] },
  { num: '3', title: 'Keep Using Your Wallet', desc: ['Ping your Ark on occasion to keep it active', '(COMING SOON) Continue using your wallet normally'] },
];

function HowItWorks() {
  return (
    <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-700">How It Works</h3>
      <div className="flex items-center gap-2 md:gap-3">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} />
            {index < steps.length - 1 && (
              <div className="text-slate-400 text-base md:text-xl hidden sm:block">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default HowItWorks;
