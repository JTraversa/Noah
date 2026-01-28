import React from 'react';

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-dark rounded-xl p-2 md:p-4 text-center">
      <div className="text-xl md:text-2xl mb-1 md:mb-2">{icon}</div>
      <div className="font-semibold text-xs md:text-sm mb-0.5 md:mb-1 text-slate-700">{title}</div>
      <div className="text-[10px] md:text-xs text-slate-500 leading-tight">{desc}</div>
    </div>
  );
}

export default FeatureCard;
