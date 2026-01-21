import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Stats from './components/Stats';
import Footer from './components/Footer';

function App() {
  return (
    <div className="h-screen w-screen gradient-bg flex flex-col p-8 text-white overflow-hidden">
      {/* Floating orbs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-32 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300/10 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 flex items-center gap-8 py-8">
        <Hero />

        <div className="flex-1 flex flex-col gap-5">
          <Features />
          <HowItWorks />
          <Stats />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
