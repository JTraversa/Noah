import React, { useEffect, useRef, useState } from 'react';

function SlotDigit({ digit, delay = 0 }) {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [incomingDigit, setIncomingDigit] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (digit !== prevDigit.current) {
      // Start the roll animation
      setIncomingDigit(digit);
      setIsRolling(true);

      const timer = setTimeout(() => {
        // Animation complete - swap digits instantly
        setDisplayDigit(digit);
        setIncomingDigit(null);
        setIsRolling(false);
        prevDigit.current = digit;
      }, 300 + delay);

      return () => clearTimeout(timer);
    }
  }, [digit, delay]);

  // Non-numeric characters ($ , .) don't animate
  if (isNaN(parseInt(digit))) {
    return <span>{digit}</span>;
  }

  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ width: '0.6em', height: '1.2em', verticalAlign: 'bottom' }}
    >
      {/* Current/display digit */}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transition: isRolling ? 'transform 300ms ease-out, opacity 300ms ease-out' : 'none',
          transform: isRolling ? 'translateY(-120%)' : 'translateY(0)',
          opacity: isRolling ? 0 : 1
        }}
      >
        {displayDigit}
      </span>

      {/* Incoming digit - only render during animation */}
      {isRolling && incomingDigit !== null && (
        <span
          className="absolute inset-0 flex items-center justify-center animate-roll-up"
        >
          {incomingDigit}
        </span>
      )}
    </span>
  );
}

function SlotNumber({ value, className = '' }) {
  const chars = value.toString().split('');

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {chars.map((char, i) => (
        <SlotDigit key={i} digit={char} delay={i * 30} />
      ))}
    </span>
  );
}

export default SlotNumber;
