import React from 'react';
import Stat from './Stat';
import { useWalletBalance, formatUSD } from '../hooks/useWalletBalance';

function Stats() {
  const { balance, loading } = useWalletBalance();

  const protectedValue = loading ? '...' : formatUSD(balance);

  return (
    <div className="glass rounded-2xl md:rounded-3xl p-3 md:p-5 flex justify-around">
      <Stat value={protectedValue} label="Protected" />
      <Stat value="6" label="Arks" />
      <Stat value="4" label="Users" />
    </div>
  );
}

export default Stats;
