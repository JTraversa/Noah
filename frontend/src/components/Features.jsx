import React from 'react';
import FeatureCard from './FeatureCard';

const features = [
  { icon: '🛡️', title: 'Set & Forget', desc: 'Create an Ark with your beneficiary' },
  { icon: '🔔', title: 'Stay Active', desc: 'Ping to reset your timer' },
  { icon: '💝', title: 'Auto Transfer', desc: 'Assets move when needed' },
];

function Features() {
  return (
    <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-700">Why Noah?</h3>
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  );
}

export default Features;
