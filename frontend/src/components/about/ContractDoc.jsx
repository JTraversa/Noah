import React from 'react';
import ExpandableItem from './ExpandableItem';

function ContractDoc({ contract }) {
  return (
    <div className="glass-dark rounded-xl md:rounded-2xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm md:text-base font-semibold text-slate-700">{contract.name}</h4>
        <span className="text-[10px] md:text-xs text-slate-400 font-mono">{contract.file}</span>
      </div>

      <p className="text-xs md:text-sm text-slate-600 mb-4">{contract.description}</p>

      {/* Struct */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Struct: {contract.struct.name}</h5>
        <p className="text-[10px] md:text-xs text-slate-500 mb-2">{contract.struct.description}</p>
        <div className="bg-slate-50/50 rounded-lg p-3 space-y-1">
          {contract.struct.fields.map((field, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] md:text-xs">
              <code className="text-indigo-600 font-mono whitespace-nowrap">{field.type}</code>
              <code className="text-slate-700 font-mono font-semibold">{field.name}</code>
              <span className="text-slate-500">— {field.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapping */}
      {contract.mapping && (
        <div className="mb-4">
          <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Storage</h5>
          <div className="bg-slate-50/50 rounded-lg p-3">
            <code className="text-[10px] md:text-xs font-mono">
              <span className="text-indigo-600">{contract.mapping.signature}</span>
              <span className="text-slate-700 font-semibold"> {contract.mapping.name}</span>
            </code>
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">{contract.mapping.desc}</p>
          </div>
        </div>
      )}

      {/* Functions */}
      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Functions</h5>
        <div className="space-y-2">
          {contract.functions.map((fn, i) => (
            <ExpandableItem
              key={i}
              name={fn.name}
              desc={fn.desc}
              params={fn.params}
              returns={fn.returns}
              type="function"
            />
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <h5 className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Events</h5>
        <div className="space-y-2">
          {contract.events.map((event, i) => (
            <ExpandableItem
              key={i}
              name={event.name}
              desc={event.desc}
              params={event.params}
              type="event"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContractDoc;
