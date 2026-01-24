import React from 'react';
import { Link } from 'react-router-dom';

function Hero() {
  return (
    <div className="flex flex-col justify-center text-center min-[1700px]:text-left">
      <h2 className="text-4xl md:text-5xl min-[1700px]:text-6xl font-bold leading-tight mb-4 md:mb-6">
        Protect Your<br />
        <span className="text-indigo-600">Crypto Legacy</span>
      </h2>
      <p className="text-lg md:text-xl text-slate-500 mb-6 md:mb-8 max-w-lg mx-auto min-[1700px]:mx-0 leading-relaxed">
        A friendly dead man's switch ensuring your digital assets reach loved ones or backup wallets in the event of a loss of life or hardware damage. Simple, secure, automatic.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center min-[1700px]:justify-start">
        <Link
          to="/app"
          className="solid-btn px-6 md:px-8 py-3 md:py-4 rounded-2xl font-semibold text-indigo-600 text-base md:text-lg shadow-lg shadow-indigo-400/45"
        >
          Create Your Ark
        </Link>
        <Link
          to="/about"
          className="glass-btn px-6 md:px-8 py-3 md:py-4 rounded-2xl font-semibold text-slate-600 text-base md:text-lg shadow-lg shadow-indigo-400/40"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}

export default Hero;
