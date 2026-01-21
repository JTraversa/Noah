import React from 'react';

function Footer() {
  return (
    <footer className="relative z-10 flex items-center justify-between text-sm text-white/60">
      <span>ETH NYC 2025</span>
      <div className="flex gap-6">
        <a href="#" className="hover:text-white transition-colors">Twitter</a>
        <a href="#" className="hover:text-white transition-colors">Discord</a>
        <a href="#" className="hover:text-white transition-colors">GitHub</a>
      </div>
    </footer>
  );
}

export default Footer;
