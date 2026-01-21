import React from 'react';

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-dark rounded-2xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-xs text-white/60">{desc}</div>
    </div>
  );
}

export default FeatureCard;
