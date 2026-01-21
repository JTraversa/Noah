import React from 'react';

function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">Noah</h1>
      <nav className="flex items-center gap-3">
        <button className="glass-btn px-5 py-2 rounded-full text-sm font-medium">
          Features
        </button>
        <button className="glass-btn px-5 py-2 rounded-full text-sm font-medium">
          About
        </button>
        <button className="solid-btn px-6 py-2 rounded-full text-sm font-semibold text-purple-600">
          Launch App
        </button>
      </nav>
    </header>
  );
}

export default Header;
