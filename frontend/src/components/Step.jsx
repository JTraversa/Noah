import React from 'react';

function Step({ num, title, desc }) {
  return (
    <div className="glass-dark rounded-xl md:rounded-2xl p-2 md:p-4 flex-1 text-center">
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500 text-white text-xs md:text-sm font-bold flex items-center justify-center mx-auto mb-1 md:mb-2">
        {num}
      </div>
      <div className="font-semibold text-xs md:text-sm text-slate-700">{title}</div>
      <div className="text-[10px] md:text-xs text-slate-500 leading-tight">{desc}</div>
    </div>
  );
}

export default Step;
