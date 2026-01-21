import React from 'react';

function Step({ num, title, desc }) {
  return (
    <div className="glass-dark rounded-2xl p-4 flex-1 text-center">
      <div className="w-8 h-8 rounded-full bg-white/20 text-sm font-bold flex items-center justify-center mx-auto mb-2">
        {num}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-white/60">{desc}</div>
    </div>
  );
}

export default Step;
