import React from 'react';

function Footer() {
  return (
    <footer className="relative z-20 flex items-center justify-end text-sm text-slate-500 py-4 pr-4 md:fixed md:bottom-8 md:right-8 md:py-0 md:pr-0">
      <div className="flex gap-6">
        <a href="https://x.com/trynoahxyz" className="hover:text-indigo-600 transition-colors">Twitter</a>
        <a href="#" className="hover:text-indigo-600 transition-colors">Discord</a>
        <a href="https://github.com/JTraversa/Noah" className="hover:text-indigo-600 transition-colors">GitHub</a>
      </div>
    </footer>
  );
}

export default Footer;
