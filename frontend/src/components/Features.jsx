import React from 'react';
import FeatureCard from './FeatureCard';

const features = [
  { icon: '🛡️', title: 'Set & Forget', desc: 'Create an Ark with your beneficiary' },
  { icon: '🔔', title: 'Stay Active', desc: 'Ping to reset your timer' },
  { icon: '💝', title: 'Auto Transfer', desc: 'Assets move when needed' },
];

function Features() {
  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-white/90">Why Noah?</h3>
      <div className="grid grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  );
}

export default Features;
