import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Stats from './components/Stats';
import Footer from './components/Footer';
import AboutPage from './components/about/AboutPage';
import BrandKitPage from './components/about/BrandKitPage';

// Animated page wrapper
function AnimatedPage({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition enter">
      {children}
    </div>
  );
}

// Lazy load app section - wagmi only loads when user visits /app
const AppWithWagmi = lazy(() => import('./components/app/AppWithWagmi'));

function HomePage() {
  return (
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
  );
}

function AboutPageWrapper() {
  return (
    <main className="relative z-10 flex-1 py-8 overflow-auto">
      <AboutPage />
    </main>
  );
}

function BrandKitPageWrapper() {
  return (
    <main className="relative z-10 flex-1 py-8 overflow-auto">
      <BrandKitPage />
    </main>
  );
}

function AppLoadingFallback() {
  return (
    <main className="relative z-10 flex-1 py-8 overflow-auto">
      <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="glass rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
                <div className="h-3 w-32 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.1s]" />
              </div>
            </div>
            <div className="w-28 h-9 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="glass rounded-2xl p-4 md:p-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 flex-1 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
              <div className="h-4 w-40 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.1s]" />
            </div>
            <div className="h-12 w-full rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.2s]" />

            <div className="flex items-center gap-3 mt-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.3s]" />
              <div className="h-4 w-36 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.4s]" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                />
              ))}
            </div>

            <div className="h-14 w-full rounded-xl bg-gradient-to-r from-indigo-200 via-indigo-100 to-indigo-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_0.8s] mt-6" />
          </div>
        </div>
      </div>
    </main>
  );
}

function App() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen w-screen gradient-bg flex flex-col p-4 md:p-8 text-slate-700 ${isHome ? 'min-[1700px]:overflow-hidden min-[1700px]:h-screen' : 'overflow-y-auto'}`}>
      {/* Floating orbs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb-1 absolute top-20 left-20 w-40 h-40 md:w-72 md:h-72 bg-indigo-400/60 rounded-full blur-3xl" />
        <div className="orb-2 absolute bottom-20 right-32 w-52 h-52 md:w-96 md:h-96 bg-violet-400/50 rounded-full blur-3xl" />
        <div className="orb-3 absolute top-1/2 left-1/2 w-44 h-44 md:w-80 md:h-80 bg-indigo-300/60 rounded-full blur-3xl" />
        <div className="orb-4 absolute top-1/3 right-1/4 w-36 h-36 md:w-64 md:h-64 bg-purple-400/40 rounded-full blur-3xl" />
      </div>

      <Header />

      <AnimatedPage>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPageWrapper />} />
          <Route path="/brand-kit" element={<BrandKitPageWrapper />} />
          <Route path="/app" element={<Suspense fallback={<AppLoadingFallback />}><AppWithWagmi /></Suspense>} />
        </Routes>
      </AnimatedPage>

      <Footer />
    </div>
  );
}

export default App;
