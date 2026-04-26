'use client';

import { CodeDisplay } from '@/app/components/CodeDisplay';

const JS_CODE = `function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

greet('SoroScan');`;

const TS_CODE = `interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
}

async function fetchTransaction(id: string): Promise<Transaction> {
  const res = await fetch(\`/api/transactions/\${id}\`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}`;

const PYTHON_CODE = `def decode_event(payload: dict) -> dict:
    """Decode a raw contract event payload."""
    event_type = payload.get("type", "unknown")
    data = payload.get("data", {})
    return {"event": event_type, "decoded": data}`;

const JSON_CODE = `{
  "contract": "GABC1234XYZ",
  "event": "Transfer",
  "payload": {
    "from": "GADDR1",
    "to": "GADDR2",
    "amount": "1000000"
  },
  "ledger": 82109334,
  "timestamp": "2026-04-26T10:00:00Z"
}`;

const BASH_CODE = `#!/bin/bash
# Deploy SoroScan backend
docker build -t soroscan-backend .
docker push registry.example.com/soroscan-backend:latest
kubectl rollout restart deployment/soroscan-backend`;

const LONG_CODE = `const result = await client.query({ query: GET_CONTRACT_EVENTS, variables: { contractId: "GABC1234XYZ", limit: 100, offset: 0, filter: { eventType: "Transfer", fromLedger: 82000000 } } });`;

export default function CodeDisplayDemo() {
  return (
    <main className="min-h-screen p-8 font-mono" style={{ background: '#0a0f0a', color: '#e0ffe0' }}>
      <h1 className="text-2xl tracking-widest uppercase mb-1" style={{ color: '#00ff88' }}>
        CodeDisplay
      </h1>
      <p className="text-xs tracking-wider mb-10" style={{ color: '#4a7a4a' }}>
        Component preview — syntax highlighting · copy · line numbers · dark terminal theme
      </p>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>JavaScript</p>
        <CodeDisplay code={JS_CODE} language="javascript" label="greet.js" showLineNumbers />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>TypeScript</p>
        <CodeDisplay code={TS_CODE} language="typescript" label="transaction.ts" showLineNumbers />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>Python</p>
        <CodeDisplay code={PYTHON_CODE} language="python" label="decoder.py" />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>JSON</p>
        <CodeDisplay code={JSON_CODE} language="json" label="event.json" showLineNumbers />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>Bash</p>
        <CodeDisplay code={BASH_CODE} language="bash" label="deploy.sh" />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>Long line — horizontal scroll</p>
        <CodeDisplay code={LONG_CODE} language="javascript" label="long-line.js" />
      </section>

      <section className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a7a4a' }}>No label · no line numbers</p>
        <CodeDisplay code={JS_CODE} language="javascript" />
      </section>
    </main>
  );
}
