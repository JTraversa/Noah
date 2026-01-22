import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Stats from './components/Stats';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen w-screen gradient-bg flex flex-col p-4 md:p-8 text-slate-700 overflow-auto min-[1700px]:overflow-hidden">
      {/* Floating orbs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb-1 absolute top-20 left-20 w-72 h-72 bg-indigo-400/60 rounded-full blur-3xl" />
        <div className="orb-2 absolute bottom-20 right-32 w-96 h-96 bg-violet-400/50 rounded-full blur-3xl" />
        <div className="orb-3 absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-300/60 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 flex flex-col gap-8 py-8 min-[1700px]:grid min-[1700px]:grid-cols-6 min-[1700px]:items-center">
        <div className="min-[1700px]:col-start-2 min-[1700px]:col-span-2">
          <Hero />
        </div>

        <div className="flex flex-col gap-4 min-[1700px]:gap-5 min-[1700px]:col-span-2">
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
