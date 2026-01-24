import React, { useState } from 'react';

function ExpandableItem({ name, desc, params, returns, type }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = (params && params.length > 0) || (returns && returns.length > 0);

  const paramString = params ? params.map(p => `${p.type} ${p.name}`).join(', ') : '';

  return (
    <div className="bg-slate-50/50 rounded-lg overflow-hidden">
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={`w-full p-3 flex items-center justify-between text-left ${hasDetails ? 'cursor-pointer hover:bg-slate-100/50' : 'cursor-default'}`}
      >
        <div className="flex-1 min-w-0">
          <code className="text-[10px] md:text-xs font-mono">
            <span className={`font-semibold ${type === 'event' ? 'text-amber-600' : 'text-indigo-600'}`}>{name}</span>
            <span className="text-slate-500">({paramString})</span>
          </code>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">{desc}</p>
        </div>
        {hasDetails && (
          <span className={`ml-2 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ›
          </span>
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200/50">
          {params && params.length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Parameters</div>
              <div className="space-y-1">
                {params.map((param, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
                    <code className="text-indigo-600 font-mono whitespace-nowrap">{param.type}</code>
                    <code className="text-slate-700 font-mono font-semibold">{param.name}</code>
                    <span className="text-slate-500">— {param.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {returns && returns.length > 0 && (
            <div>
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Returns</div>
              <div className="space-y-1">
                {returns.map((ret, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
                    <code className="text-green-600 font-mono whitespace-nowrap">{ret.type}</code>
                    <code className="text-slate-700 font-mono font-semibold">{ret.name}</code>
                    <span className="text-slate-500">— {ret.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExpandableItem;
