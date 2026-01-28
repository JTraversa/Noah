import React from 'react';

function Step({ num, title, desc, footnote, variant = 'default' }) {
  const isProtection = variant === 'protection';

  const renderDesc = () => {
    if (Array.isArray(desc)) {
      return (
        <ul className="text-[10px] md:text-xs text-slate-500 leading-tight text-left list-disc list-inside">
          {desc.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    return <div className="text-[10px] md:text-xs text-slate-500 leading-tight">{desc}</div>;
  };

  return (
    <div className={`glass-dark rounded-xl p-2 md:p-4 flex-1 text-center ${isProtection ? 'border border-red-200/50' : ''}`}>
      <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full text-white text-xs md:text-sm font-bold flex items-center justify-center mx-auto mb-1 md:mb-2 ${isProtection ? 'bg-red-500' : 'bg-indigo-500'}`}>
        {num}
      </div>
      <div className="font-semibold text-xs md:text-sm text-slate-700 mb-1">{title}</div>
      {renderDesc()}
      {footnote && (
        <div className="text-[8px] md:text-[10px] text-slate-400 italic mt-1 leading-tight">{footnote}</div>
      )}
    </div>
  );
}

export default Step;
