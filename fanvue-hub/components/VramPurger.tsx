'use client';

import { useState } from 'react';

export default function VramPurger() {
    const [status, setStatus] = useState<'idle' | 'cleaning' | 'done'>('idle');

    const handlePurge = async () => {
        if (status === 'cleaning') return;
        setStatus('cleaning');
        try {
            const res = await fetch('/api/system/purge-vram', { method: 'POST' });
            const data = await res.json();
            console.log('Purge Report:', data.report);
            setStatus('done');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    return (
        <button
            onClick={handlePurge}
            title="Clear VRAM (Unload Ollama Models)"
            style={{
                background: status === 'done' ? '#333' : (status === 'cleaning' ? '#222' : 'transparent'),
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '0 12px',
                height: '32px', // Compact
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center text
                gap: '8px',
                color: status === 'done' ? '#fff' : (status === 'cleaning' ? '#ccc' : '#666'),
                transition: 'all 0.2s',
                marginLeft: 'auto',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}
        >
            {status === 'cleaning' ? 'Purging...' : (status === 'done' ? 'Cleaned' : 'Free VRAM')}
        </button>
    );
}
