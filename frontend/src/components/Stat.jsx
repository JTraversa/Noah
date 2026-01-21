import React from 'react';

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-lg md:text-2xl font-bold text-indigo-600">{value}</div>
      <div className="text-[10px] md:text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default Stat;
