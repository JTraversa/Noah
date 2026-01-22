import { useState, useEffect, useRef } from 'react';

const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImY0ZTMzNTY4LTI3ZWMtNGI3ZS1hYWVlLTUxNTAwMzA0NTgwZSIsIm9yZ0lkIjoiMzcwOTMzIiwidXNlcklkIjoiMzgxMjE2IiwidHlwZUlkIjoiMzMwYzBlZmMtMWY3NS00OGJiLWJmYzUtMWE3N2IwZDc3ZTA1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDQ0NTA4MzcsImV4cCI6NDg2MDIxMDgzN30.mQ3AgGu9_BGpKNG6meMI3WiSF-7LGkdih2MYk_BqCl4';
const WALLET_ADDRESS = '0x3f60008Dfd0EfC03F476D9B489D6C5B13B3eBF2C';
const CHAINS = ['arbitrum'];
const ADDITIONAL_VALUE = (16.5 * 3300) + 105000 + 1000000;

// 12% APY - per millisecond rate
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;
const APY_RATE = 0.12;
const RATE_PER_MS = APY_RATE / (SECONDS_PER_YEAR * 1000);

// Module-level cache to ensure single fetch per page load
let cachedBalance = null;
let fetchPromise = null;
let fetchTimestamp = null;

async function fetchNetWorth() {
  const chainParams = CHAINS.map(c => `chains[]=${c}`).join('&');
  const response = await fetch(
    `https://deep-index.moralis.io/api/v2.2/wallets/${WALLET_ADDRESS}/net-worth?${chainParams}&exclude_spam=true&exclude_unverified_contracts=true`,
    {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Net worth API error: ${response.status}`);
  }

  const data = await response.json();
  return data.total_networth_usd ? parseFloat(data.total_networth_usd) : 0;
}

async function fetchDefiPositions() {
  let totalDefiValue = 0;

  // Fetch DeFi summary for each chain
  for (const chain of CHAINS) {
    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${WALLET_ADDRESS}/defi/summary?chain=${chain}`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.total_usd_value) {
          totalDefiValue += parseFloat(data.total_usd_value);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch DeFi summary for ${chain}:`, err);
    }
  }

  return totalDefiValue;
}

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
      // Fetch net worth and DeFi positions in parallel
      const [netWorth, defiValue] = await Promise.all([
        fetchNetWorth(),
        fetchDefiPositions(),
      ]);

      // Combine values (net worth already includes tokens, add DeFi on top)
      // Plus additional value for assets not tracked by API
      cachedBalance = netWorth + defiValue + ADDITIONAL_VALUE;
      fetchTimestamp = Date.now();
      return cachedBalance;
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
      cachedBalance = 0;
      fetchTimestamp = Date.now();
      return 0;
    }
  })();

  return fetchPromise;
}

// Calculate current value with APY growth
function calculateCurrentValue(baseValue, startTime) {
  const elapsed = Date.now() - startTime;
  return baseValue * (1 + (elapsed * RATE_PER_MS));
}

export function useWalletBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  const [loading, setLoading] = useState(cachedBalance === null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (cachedBalance === null) {
      fetchWalletBalance().then((value) => {
        setBalance(value);
        setLoading(false);
      });
    } else {
      setBalance(cachedBalance);
      setLoading(false);
    }
  }, []);

  // Update every 5 seconds - odometer animation handles the visual transition
  useEffect(() => {
    if (loading || cachedBalance === null) return;

    // Update every 5 seconds
    const interval = setInterval(() => {
      const currentValue = calculateCurrentValue(cachedBalance, fetchTimestamp);
      setBalance(currentValue);
    }, 5000);

    return () => clearInterval(interval);
  }, [loading]);

  return { balance, loading };
}

export function formatUSD(value) {
  if (value === null || value === undefined) return '$0';

  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}
