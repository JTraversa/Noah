import React from 'react';
import Step from './Step';

const steps = [
  { num: '1', title: 'Build Ark', desc: 'Set beneficiary & deadline' },
  { num: '2', title: 'Add Tokens', desc: 'Deposit assets to protect' },
  { num: '3', title: 'Stay Active', desc: 'Ping or auto-transfer' },
];

function HowItWorks() {
  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-white/90">How It Works</h3>
      <div className="flex items-center gap-3">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <Step {...step} />
            {index < steps.length - 1 && (
              <div className="text-white/40 text-xl">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default HowItWorks;
