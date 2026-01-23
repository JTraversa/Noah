import React from 'react';

function Footer() {
  return (
    <footer className="relative z-10 flex items-center justify-end text-sm text-slate-500">
      <div className="flex gap-6">
        <a href="#" className="hover:text-indigo-600 transition-colors">Twitter</a>
        <a href="#" className="hover:text-indigo-600 transition-colors">Discord</a>
        <a href="#" className="hover:text-indigo-600 transition-colors">GitHub</a>
      </div>
    </footer>
  );
}

export default Footer;
