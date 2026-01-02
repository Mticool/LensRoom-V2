'use client';

import { useState } from 'react';

export default function TestMinimalPage() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', backgroundColor: '#0F0F10', minHeight: '100vh', color: 'white' }}>
      <h1>Минимальный тест #310</h1>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}
      >
        Увеличить
      </button>
    </div>
  );
}




