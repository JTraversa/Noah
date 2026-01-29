import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const logoUrl = new URL('../assets/NoahLogoWordmark.png', import.meta.url);

function Header() {
  const location = useLocation();
  const isApp = location.pathname === '/app';

  return (
    <header className="relative z-10 flex items-center justify-between">
      <Link to="/" className="ml-2 md:ml-4">
        <img
          src={logoUrl.href}
          alt="Noah"
          className="h-10 md:h-14 w-auto object-contain"
        />
      </Link>
      <nav className="flex items-center gap-2 md:gap-3">
        <Link
          to="/about"
          className="glass-btn px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 shadow-lg shadow-indigo-400/40"
        >
          About
        </Link>
        {isApp ? (
          <div id="connect-button-slot" />
        ) : (
          <Link
            to="/app"
            className="solid-btn px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-400/45"
          >
            Launch App
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
