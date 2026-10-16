import React, { useState } from 'react';

export default function RateLimitWidget() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);

  const checkLimits = async (e) => {
    e.preventDefault();
    if (!apiKey) return;

    setLoading(true);
    setError(null);
    setLimits(null);

    try {
      // In a real environment, this points to the production API (e.g. https://api.soroscan.io)
      const response = await fetch('http://localhost:8000/api/ingest/api-keys/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok && response.status !== 429) {
        throw new Error(`API returned status: ${response.status}`);
      }

      const limit = response.headers.get('X-RateLimit-Limit') || '1000';
      const remaining = response.headers.get('X-RateLimit-Remaining') || '999';
      const reset = response.headers.get('X-RateLimit-Reset') || '0';

      setLimits({
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch rate limits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '20px',
      marginTop: '20px',
      backgroundColor: 'var(--ifm-background-surface-color)'
    }}>
      <h3>Check Your Live Rate Limits</h3>
      <p>Enter your Developer API Key below to check your current rate limit usage.</p>
      
      <form onSubmit={checkLimits} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="password" 
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk_live_..."
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid var(--ifm-color-emphasis-400)',
            backgroundColor: 'var(--ifm-background-color)',
            color: 'var(--ifm-font-color-base)'
          }}
        />
        <button 
          type="submit" 
          disabled={loading || !apiKey}
          className="button button--primary"
        >
          {loading ? 'Checking...' : 'Check Limits'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--ifm-color-danger)', marginBottom: '15px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {limits && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, padding: '15px', backgroundColor: 'var(--ifm-color-emphasis-100)', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--ifm-color-emphasis-600)' }}>Total Limit</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{limits.limit}</div>
          </div>
          <div style={{ flex: 1, padding: '15px', backgroundColor: 'var(--ifm-color-emphasis-100)', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--ifm-color-emphasis-600)' }}>Remaining</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: limits.remaining < limits.limit * 0.1 ? 'var(--ifm-color-danger)' : 'var(--ifm-color-success)' }}>
              {limits.remaining}
            </div>
          </div>
          <div style={{ flex: 1, padding: '15px', backgroundColor: 'var(--ifm-color-emphasis-100)', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--ifm-color-emphasis-600)' }}>Resets In</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{limits.reset}s</div>
          </div>
        </div>
      )}
    </div>
  );
}
