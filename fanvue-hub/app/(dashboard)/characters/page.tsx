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
            const res = await fetch('/api/models/loras');
            const data = await res.json();
            if (data.success && data.loras) {
                setAvailableLoras(data.loras);
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>;

    return (
        <div style={{ padding: '60px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '400',
                        letterSpacing: '0.02em',
                        marginBottom: '8px',
                        color: '#fff'
                    }}>Characters</h1>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '0.03em' }}>MANAGE AI PERSONAS</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    style={{
                        padding: '12px 32px',
                        background: 'transparent',
                        color: '#fff',
                        border: '2px solid white',
                        borderRadius: '0',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '13px',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 0 20px rgba(255,255,255,0.1)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = 'black';
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.1)';
                    }}
                >
                    + NEW
                </button>
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

                        {/* LoRA Models - Collapsible Sections */}
                        <div style={{ marginTop: '24px' }}>
                            <h4 style={{ fontSize: '13px', letterSpacing: '0.1em', color: '#aaa', marginBottom: '16px', textTransform: 'uppercase' }}>Model LoRAs</h4>

                            {/* Image Models Section */}
                            <details open style={{ marginBottom: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                <summary style={{ fontSize: '12px', letterSpacing: '0.05em', color: '#fff', cursor: 'pointer', marginBottom: '12px', fontWeight: 500 }}>📸 Image Models</summary>
                                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr', marginTop: '8px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#888', textTransform: 'uppercase' }}>Flux LoRA</label>
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
                                            style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: '2px', fontSize: '12px' }}
                                        >
                                            <option value="">-- None --</option>
                                            {availableLoras.map(lora => (
                                                <option key={lora} value={lora}>{lora}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#888', textTransform: 'uppercase' }}>Qwen LoRA</label>
                                        <select
                                            value={qwenLoraPath}
                                            onChange={e => setQwenLoraPath(e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: '2px', fontSize: '12px' }}
                                        >
                                            <option value="">-- None --</option>
                                            {availableLoras.map(lora => (
                                                <option key={lora} value={lora}>{lora}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                            </details>
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
                            {characters.map(char => (
                                <div key={char.id} style={{ position: 'relative', background: '#000', aspectRatio: '1/1' }}>
                                    <Link href={`/characters/${char.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                                        <div style={{
                                            position: 'relative',
                                            background: '#000',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            height: '100%',
                                            width: '100%',
                                            overflow: 'hidden'
                                        }}
                                            onMouseEnter={(e) => {
                                                const overlay = e.currentTarget.querySelector('.overlay') as HTMLElement;
                                                if (overlay) overlay.style.opacity = '1';
                                            }}
                                            onMouseLeave={(e) => {
                                                const overlay = e.currentTarget.querySelector('.overlay') as HTMLElement;
                                                if (overlay) overlay.style.opacity = '0';
                                            }}
                                        >
                                            {/* Portrait Image */}
                                            {char.avatarUrl ? (
                                                <img
                                                    src={char.avatarUrl}
                                                    alt={char.name}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '64px',
                                                    fontWeight: '200',
                                                    color: 'rgba(255,255,255,0.1)'
                                                }}>
                                                    {char.name.charAt(0)}
                                                </div>
                                            )}

                                            {/* Info Overlay - Always visible at bottom */}
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)',
                                                padding: '40px 20px 20px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                <h3 style={{
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    fontWeight: '400',
                                                    letterSpacing: '0.02em',
                                                    margin: 0
                                                }}>{char.name}</h3>
                                                <p style={{
                                                    color: 'rgba(255,255,255,0.3)',
                                                    fontSize: '11px',
                                                    letterSpacing: '0.03em',
                                                    fontWeight: '300',
                                                    margin: 0
                                                }}>{char.handle || '@unknown'}</p>
                                            </div>

                                            {/* Hover Overlay - Shows manage text */}
                                            <div
                                                className="overlay"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    background: 'rgba(0,0,0,0.7)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s ease',
                                                    fontSize: '11px',
                                                    color: '#fff',
                                                    letterSpacing: '0.1em',
                                                    textTransform: 'uppercase',
                                                    fontWeight: '300'
                                                }}
                                            >
                                                Manage →
                                            </div>
                                        </div>
                                    </Link>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(char.slug);
                                        }}
                                        title="Delete"
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '2px',
                                            border: 'none',
                                            background: 'rgba(0,0,0,0.6)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'rgba(255,255,255,0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            zIndex: 10
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                                            e.currentTarget.style.color = '#ff4444';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
