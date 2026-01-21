import React from 'react';

function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-indigo-600">Noah</h1>
      <nav className="flex items-center gap-2 md:gap-3">
        <button className="glass-btn px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium hidden sm:block text-slate-600 shadow-lg shadow-indigo-400/40">
          Features
        </button>
        <button className="glass-btn px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium hidden sm:block text-slate-600 shadow-lg shadow-indigo-400/40">
          About
        </button>
        <button className="solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-400/45">
          Launch App
        </button>
      </nav>
    </header>
  );
}

export default Header;
