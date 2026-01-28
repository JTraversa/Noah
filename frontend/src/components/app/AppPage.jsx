import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { NOAH_ADDRESS, NOAH_ABI } from '../../contracts/noah';
import CreateTab from './CreateTab';
import ManageTab from './ManageTab';
import ActivityTab from './ActivityTab';

function AppPage() {
  const [activeTab, setActiveTab] = useState('ark');
  const { address } = useAccount();

  // Read ark data from contract
  const { data: arkData, refetch: refetchArk } = useReadContract({
    address: NOAH_ADDRESS,
    abi: NOAH_ABI,
    functionName: 'getArk',
    args: [address],
    enabled: !!address,
  });

  // Check if ark exists (deadline > 0)
  const hasArk = arkData && arkData[1] > 0n;

  const tabs = [
    { id: 'ark', label: hasArk ? 'Manage Ark' : 'Create Ark' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto w-full">
      {/* Back button */}
      <Link
        to="/"
        className="glass-btn self-start px-4 py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2"
      >
        <span>←</span> Home
      </Link>

      {/* App Header */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-4">Your Ark</h2>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100/50 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass rounded-2xl p-4 md:p-6 overflow-hidden">
        <div key={activeTab} className="tab-content-enter">
          {activeTab === 'ark' && (hasArk ? <ManageTab /> : <CreateTab onArkCreated={refetchArk} />)}
          {activeTab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}

export default AppPage;
