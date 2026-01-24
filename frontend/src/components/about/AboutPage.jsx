import React from 'react';
import { Link } from 'react-router-dom';
import ContractDoc from './ContractDoc';
import { contract } from './contractData';

function AboutPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/"
        className="glass-btn self-start px-4 py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2"
      >
        <span>←</span> Back
      </Link>

      {/* Blurb */}
      <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-3">About Noah</h2>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
          Noah is a decentralized dead man's switch protocol that ensures your digital assets reach your intended beneficiaries
          in case of loss of life, hardware damage, or loss of access to your wallet.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
          By creating an "Ark" for your tokens, you establish a trustless inheritance system. Simply ping your Ark periodically
          to signal you're still in control. If the deadline passes without a ping, anyone can trigger a "flood" that transfers
          your assets to your designated beneficiary — incentivized through MEV opportunities.
        </p>
        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
          No centralized custody. No trusted third parties. Just smart contracts protecting your crypto legacy.
        </p>
      </div>

      {/* Technical Documentation */}
      <div className="glass rounded-2xl md:rounded-3xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Technical Documentation</h3>
        <p className="text-xs md:text-sm text-slate-500 mb-4">
          Smart contract specifications derived from NatSpec documentation.
        </p>
        <ContractDoc contract={contract} />
      </div>
    </div>
  );
}

export default AboutPage;
