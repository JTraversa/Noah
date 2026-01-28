import React from 'react';
import { Link } from 'react-router-dom';
import ContractDoc from './ContractDoc';
import { contract } from './contractData';

const profileImage = new URL('../../assets/TraversaDenza.png', import.meta.url);

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
      <div className="glass rounded-2xl p-4 md:p-6">
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
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Technical Documentation</h3>
        <p className="text-xs md:text-sm text-slate-500 mb-4">
          Smart contract specifications derived from NatSpec documentation.
        </p>
        <ContractDoc contract={contract} />
      </div>

      {/* Developer */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Developer</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img
            src={profileImage.href}
            alt="Julian Traversa"
            className="w-16 h-16 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0 object-cover"
          />
          <div className="flex-1">
            <h4 className="text-sm md:text-base font-semibold text-slate-700 mb-2">Julian Traversa</h4>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
              Technical architect specializing in lending and pricing infrastructure. Contributor to EIP-4626,
              EIP-7726 and author of EIP-5095. Previously founded Swivel Finance, the first yield tokenization
              platform, and Warlock Labs, the first OEV based oracle.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://github.com/jtraversa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://twitter.com/TraversaJulian"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </a>
              <a
                href="https://traversa.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                </svg>
                Website
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <span className="text-xs md:text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">GitHub</span>
          </a>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <span className="text-xs md:text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">Twitter</span>
          </a>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <span className="text-xs md:text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">Discord</span>
          </a>

          <Link
            to="/brand-kit"
            className="flex flex-col items-center gap-2 p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span className="text-xs md:text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">Brand Kit</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
