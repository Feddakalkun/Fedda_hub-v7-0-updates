'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Character {
    id: string;
    name: string;
    slug: string;
    handle?: string;
    avatarUrl?: string;
}

export default function CharactersPage() {
    const router = useRouter();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newHandle, setNewHandle] = useState('');
    const [newBio, setNewBio] = useState('');

    // LoRA State
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [selectedLora, setSelectedLora] = useState('');
    const [qwenLoraPath, setQwenLoraPath] = useState('');
    const [appearance, setAppearance] = useState('');

    const loadCharacters = async () => {
        try {
            const res = await fetch('/api/characters');
            const data = await res.json();
            if (data.success) {
                setCharacters(data.characters);
            }
        } catch (e) {
            console.error('Failed to load characters:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadLoras = async () => {
        try {
            const res = await fetch('/api/comfyui/models');
            const data = await res.json();
            if (data.success && data.models?.loras) {
                setAvailableLoras(data.models.loras);
            }
        } catch (e) {
            console.error('Failed to load LoRAs:', e);
        }
    };

    useEffect(() => {
        loadCharacters();
        loadLoras();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    handle: newHandle,
                    bio: newBio,
                    loraPath: selectedLora,
                    qwenLoraPath: qwenLoraPath || undefined,
                    appearance: appearance
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewName('');
                setNewHandle('');
                setNewBio('');
                setSelectedLora('');
                setQwenLoraPath('');
                setAppearance('');
                setIsCreating(false);
                loadCharacters();
            } else {
                alert('Failed to create: ' + data.error);
            }
        } catch (e) {
            alert('Error creating character');
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('Are you sure you want to delete this character? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/characters/${slug}`, { method: 'DELETE' });
            if (res.ok) {
                loadCharacters();
            } else {
                alert('Failed to delete character');
            }
        } catch (e) {
            console.error('Error deleting:', e);
            alert('Error deleting character');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Empire...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>My Characters</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage your AI personas</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>

                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn btn-primary"
                        style={{
                            padding: '12px 24px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        + New Character
                    </button>
                </div>
            </div>

            {/* Creation Form Modal/Inline */}
            {isCreating && (
                <div style={{
                    marginBottom: '40px',
                    padding: '24px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Create New Persona</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>Name</label>
                                <input
                                    value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Jessica"
                                    required
                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>Handle (Optional)</label>
                                <input
                                    value={newHandle} onChange={e => setNewHandle(e.target.value)}
                                    placeholder="e.g. @jess_ai"
                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '16px', display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>LoRA Model (Z-Image)</label>
                                <select
                                    value={selectedLora}
                                    onChange={async (e) => {
                                        const loraPath = e.target.value;
                                        setSelectedLora(loraPath);

                                        // Auto-fill Appearance if description.txt exists
                                        if (loraPath) {
                                            try {
                                                const res = await fetch(`/api/loras/description?path=${encodeURIComponent(loraPath)}`);
                                                const data = await res.json();
                                                if (data.description) {
                                                    setAppearance(data.description);
                                                    console.log('[UI] Auto-filled Appearance from description.txt');
                                                }
                                            } catch (error) {
                                                console.error('[UI] Failed to fetch description:', error);
                                            }
                                        }
                                    }}
                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                >
                                    <option value="">-- Select LoRA --</option>
                                    {availableLoras.map(lora => (
                                        <option key={lora} value={lora}>{lora}</option>
                                    ))}
                                    {availableLoras.length === 0 && <option disabled>No LoRAs found</option>}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>Qwen LoRA (Optional)</label>
                                <select
                                    value={qwenLoraPath}
                                    onChange={e => setQwenLoraPath(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                >
                                    <option value="">-- None --</option>
                                    {availableLoras.map(lora => (
                                        <option key={lora} value={lora}>{lora}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>Appearance Prompt</label>
                            <textarea
                                value={appearance}
                                onChange={e => setAppearance(e.target.value)}
                                placeholder="blonde hair, blue eyes, freckles across nose and cheeks..."
                                rows={3}
                                style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#aaa' }}>Bio (Optional)</label>
                            <textarea
                                value={newBio} onChange={e => setNewBio(e.target.value)}
                                placeholder="Short description..."
                                rows={2}
                                style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button type="submit" style={{ padding: '8px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create Persona</button>
                            <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '8px 16px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Character Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
                {characters.map(char => (
                    <div key={char.id} style={{ position: 'relative', isolation: 'isolate' }}>
                        <Link href={`/characters/${char.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '16px',
                                padding: '24px',
                                textAlign: 'center',
                                transition: 'transform 0.2s, background 0.2s',
                                cursor: 'pointer',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            >
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%', background: '#222',
                                    margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '32px', border: '1px solid #333'
                                }}>
                                    {char.name.charAt(0)}
                                </div>
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>{char.name}</h3>
                                <p style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>{char.handle || '@unknown'}</p>

                                <div style={{ marginTop: '20px', padding: '8px', background: '#111', borderRadius: '8px', fontSize: '12px', color: '#666', width: '100%' }}>
                                    Manage Dashboard →
                                </div>
                            </div>
                        </Link>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(char.slug);
                            }}
                            title="Delete Character"
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255, 0, 0, 0.15)',
                                color: '#ff4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                zIndex: 10
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                ))}

                {/* Empty State */}
                {!loading && characters.length === 0 && !isCreating && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#666' }}>

                        <p>No characters found.</p>
                        <p>Create your first persona to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
