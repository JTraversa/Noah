import { useState, useEffect } from 'react';

const ZERION_API_KEY = 'zk_b12410442a3249daa38955e76a4d5327';
const WALLET_ADDRESS = '0x3f60008Dfd0EfC03F476D9B489D6C5B13B3eBF2C';

// Module-level cache to ensure single fetch per page load
let cachedBalance = null;
let fetchPromise = null;

async function fetchWalletBalance() {
  // Return cached result if available
  if (cachedBalance !== null) {
    return cachedBalance;
  }

  // Return existing promise if fetch is in progress
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    try {
      const response = await fetch(
        `https://api.zerion.io/v1/wallets/${WALLET_ADDRESS}/portfolio?currency=usd`,
        {
          headers: {
            'Authorization': `Basic ${btoa(ZERION_API_KEY + ':')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      cachedBalance = data?.data?.attributes?.total?.positions || 0;
      return cachedBalance;
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
      cachedBalance = 0;
      return 0;
    }
  })();

  return fetchPromise;
}

export function useWalletBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  const [loading, setLoading] = useState(cachedBalance === null);

  useEffect(() => {
    if (cachedBalance !== null) {
      setBalance(cachedBalance);
      setLoading(false);
      return;
    }

    fetchWalletBalance().then((value) => {
      setBalance(value);
      setLoading(false);
    });
  }, []);

  return { balance, loading };
}

export function formatUSD(value) {
  if (value === null || value === undefined) return '$0';

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}
