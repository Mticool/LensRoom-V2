'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  console.log('TestPage render start');
  
  // Hook 1
  const [count, setCount] = useState(0);
  console.log('Hook 1: useState called');
  
  // Hook 2
  const [show, setShow] = useState(true);
  console.log('Hook 2: useState called');
  
  // Hook 3
  useEffect(() => {
    console.log('Hook 3: useEffect called');
  }, []);
  
  console.log('TestPage render end, returning JSX');
  
  return show ? (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>✅ Тест хуков</h1>
      <p>Если вы видите это - хуки работают!</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setShow(false)}>Скрыть</button>
      <pre style={{ background: '#222', padding: '10px', color: '#0f0' }}>
        {`
Hook 1: useState ✅
Hook 2: useState ✅  
Hook 3: useEffect ✅
Conditional render: ✅
        `}
      </pre>
    </div>
  ) : (
    <div style={{ padding: '20px' }}>
      <h1>Скрыто</h1>
      <button onClick={() => setShow(true)}>Показать</button>
    </div>
  );
}


