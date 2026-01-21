import React from 'react';

function Hero() {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <h2 className="text-6xl font-bold leading-tight mb-6">
        Protect Your<br />
        <span className="text-white/90">Crypto Legacy</span>
      </h2>
      <p className="text-xl text-white/70 mb-8 max-w-lg leading-relaxed">
        A friendly dead man's switch ensuring your digital assets reach your loved ones. Simple, secure, automatic.
      </p>
      <div className="flex gap-4">
        <button className="solid-btn px-8 py-4 rounded-2xl font-semibold text-purple-600 text-lg">
          Create Your Ark
        </button>
        <button className="glass-btn px-8 py-4 rounded-2xl font-semibold text-lg">
          Learn More
        </button>
      </div>
    </div>
  );
}

export default Hero;
