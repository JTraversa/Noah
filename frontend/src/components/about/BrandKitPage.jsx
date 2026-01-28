import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const logoUrl = new URL('../../assets/NoahLogo.png', import.meta.url);
const logoWordmarkUrl = new URL('../../assets/NoahLogoWordmark.png', import.meta.url);

const colors = [
  {
    name: 'Primary',
    shades: [
      { name: 'Indigo 600', hex: '#4f46e5', tailwind: 'indigo-600' },
      { name: 'Indigo 500', hex: '#6366f1', tailwind: 'indigo-500' },
      { name: 'Indigo 400', hex: '#818cf8', tailwind: 'indigo-400' },
    ],
  },
  {
    name: 'Accent',
    shades: [
      { name: 'Purple 600', hex: '#9333ea', tailwind: 'purple-600' },
      { name: 'Purple 500', hex: '#a855f7', tailwind: 'purple-500' },
      { name: 'Violet 500', hex: '#8b5cf6', tailwind: 'violet-500' },
    ],
  },
  {
    name: 'Neutral',
    shades: [
      { name: 'Slate 700', hex: '#334155', tailwind: 'slate-700' },
      { name: 'Slate 500', hex: '#64748b', tailwind: 'slate-500' },
      { name: 'Slate 200', hex: '#e2e8f0', tailwind: 'slate-200' },
    ],
  },
  {
    name: 'Semantic',
    shades: [
      { name: 'Emerald 500', hex: '#10b981', tailwind: 'emerald-500' },
      { name: 'Amber 500', hex: '#f59e0b', tailwind: 'amber-500' },
      { name: 'Red 500', hex: '#ef4444', tailwind: 'red-500' },
    ],
  },
];

function ColorSwatch({ color, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex flex-col items-center gap-2 transition-all"
    >
      <div
        className="w-16 h-16 md:w-20 md:h-20 rounded-xl shadow-md group-hover:scale-110 transition-transform"
        style={{ backgroundColor: color.hex }}
      />
      <div className="text-center">
        <div className="text-xs font-medium text-slate-700">{color.name}</div>
        <div className="text-[10px] font-mono text-slate-500">
          {copied ? 'Copied!' : color.hex}
        </div>
      </div>
    </button>
  );
}

function DownloadButton({ href, filename, label }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(href);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 rounded-lg transition-all"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </button>
  );
}

function BrandKitPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/about"
        className="glass-btn self-start px-4 py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2"
      >
        <span>←</span> About
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-2">Brand Kit</h2>
        <p className="text-sm text-slate-500">
          Official Noah brand assets and guidelines. Click on colors to copy hex values.
        </p>
      </div>

      {/* Logo */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Logo</h3>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="flex-1 flex justify-center p-8 bg-white rounded-xl border border-slate-100">
            <img
              src={logoUrl.href}
              alt="Noah Logo"
              className="h-24 md:h-32 w-auto object-contain"
            />
          </div>
          <div className="flex-1 flex justify-center p-8 bg-slate-800 rounded-xl">
            <img
              src={logoUrl.href}
              alt="Noah Logo on dark"
              className="h-24 md:h-32 w-auto object-contain"
            />
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <DownloadButton href={logoUrl.href} filename="noah-logo.png" label="Download PNG" />
        </div>
      </div>

      {/* Logo + Wordmark */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Logo + Wordmark</h3>
        <div className="flex flex-col gap-6">
          <div className="flex justify-center p-8 bg-white rounded-xl border border-slate-100">
            <img
              src={logoWordmarkUrl.href}
              alt="Noah Logo with Wordmark"
              className="h-16 md:h-20 w-auto object-contain"
            />
          </div>
          <div className="flex justify-center p-8 bg-slate-800 rounded-xl">
            <img
              src={logoWordmarkUrl.href}
              alt="Noah Logo with Wordmark on dark"
              className="h-16 md:h-20 w-auto object-contain"
            />
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <DownloadButton href={logoWordmarkUrl.href} filename="noah-logo-wordmark.png" label="Download PNG" />
        </div>
      </div>

      {/* Color Palette */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Color Palette</h3>
        <div className="space-y-6">
          {colors.map((group) => (
            <div key={group.name}>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {group.name}
              </h4>
              <div className="flex flex-wrap gap-4 md:gap-6">
                {group.shades.map((color) => (
                  <ColorSwatch key={color.hex} color={color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4">Typography</h3>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/50 rounded-xl">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Primary Font</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-700" style={{ fontFamily: 'Inter, sans-serif' }}>
              Inter
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Used for all UI text, headings, and body copy.
            </p>
            <a
              href="https://fonts.google.com/specimen/Inter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2"
            >
              Google Fonts
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandKitPage;
