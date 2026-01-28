import React from 'react';
import Stat from './Stat';
import { useWalletBalance, formatUSD } from '../hooks/useWalletBalance';

function Stats() {
  const { balance, loading } = useWalletBalance();

  const protectedValue = loading ? '...' : formatUSD(balance);

  return (
    <div className="glass rounded-2xl p-3 md:p-5 grid grid-cols-3 gap-4">
      <Stat value={protectedValue} label="Protected" animated />
      <Stat value="6" label="Arks" />
      <Stat value="4" label="Users" />
    </div>
  );
}

export default Stats;
