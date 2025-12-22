'use client';

import { useEffect, useState } from 'react';

export default function TestBalancePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Session data:', data);
      setSession(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-8">
      <div className="max-w-2xl w-full bg-[var(--surface)] rounded-xl p-8 border border-[var(--border)]">
        <h1 className="text-2xl font-bold mb-6 text-[var(--text)]">Тест баланса</h1>
        
        {loading && (
          <div className="text-[var(--muted)]">Загрузка...</div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
            Ошибка: {error}
          </div>
        )}
        
        {!loading && !error && (
          <div className="space-y-4">
            <div className="bg-[var(--surface2)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">User</h2>
              <pre className="text-xs text-[var(--text)] overflow-auto">
                {JSON.stringify(session?.user, null, 2)}
              </pre>
            </div>
            
            <div className="bg-[var(--surface2)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Balance</h2>
              <div className="text-3xl font-bold text-[var(--gold)]">
                {session?.balance || 0} ⭐
              </div>
            </div>
            
            <button
              onClick={fetchSession}
              className="w-full bg-[var(--gold)] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition"
            >
              Обновить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


