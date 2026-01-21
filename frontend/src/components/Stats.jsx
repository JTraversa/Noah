import React from 'react';
import Stat from './Stat';

const stats = [
  { value: '$0', label: 'Protected' },
  { value: '0', label: 'Arks' },
  { value: '0', label: 'Users' },
];

function Stats() {
  return (
    <div className="glass rounded-2xl md:rounded-3xl p-3 md:p-5 flex justify-around">
      {stats.map((stat, index) => (
        <Stat key={index} {...stat} />
      ))}
    </div>
  );
}

export default Stats;
