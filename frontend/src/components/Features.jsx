import React from 'react';
import FeatureCard from './FeatureCard';

const features = [
  { icon: '💓', title: 'Deadman Switch', desc: 'Identifies lost hardware or loss of life through a "deadman switch"' },
  { icon: '⚡', title: 'MEV Based Transfers', desc: 'Assets transfer to beneficiaries automatically through MEV incentivization' },
  { icon: '✨', title: 'Simple & Optimized', desc: 'Simple OSS code and optimized execution for wallet integration' }
];

function Features() {
  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-700">Features</h3>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  );
}

export default Features;
