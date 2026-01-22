import React from 'react';
import SlotNumber from './SlotNumber';

function Stat({ value, label, animated = false }) {
  return (
    <div className="text-center">
      <div className="text-lg md:text-2xl font-bold text-indigo-600">
        {animated ? (
          <SlotNumber value={value} />
        ) : (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        )}
      </div>
      <div className="text-[10px] md:text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default Stat;
