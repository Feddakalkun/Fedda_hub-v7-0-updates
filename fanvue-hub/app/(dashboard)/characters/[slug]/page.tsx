'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useComfyProgress } from '@/hooks/useComfyProgress';
import ImageGenerator from '@/components/ImageGenerator';
import LipsyncGenerator from '@/components/LipsyncGenerator';
import Library from '@/components/Library';

import LTX2Generator from '@/components/LTX2Generator';
import QwenGenerator from '@/components/QwenGenerator';

// Interfaces matching Prisma schema
interface Character {
    id: string;
    name: string;
    slug: string;
    handle?: string;
    bio?: string;
    isConnected: boolean;
    loraPath?: string;
    qwenLoraPath?: string;
    appearance?: string;
    avatarUrl?: string;
    voiceProvider?: string;
    voiceModel?: string;
    voiceId?: string; // ElevenLabs ID
    voiceDescription?: string;
    fanvueProfileId?: string;
    fanvueSecret?: string;
    llmModel?: string;
    systemInstruction?: string;
}

export default function CharacterDashboard({ params }: { params: Promise<{ slug: string }> }) {
    // Next.js 15+ unwraps params
    const { slug } = use(params);
    const router = useRouter();

    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'image' | 'lipsync' | 'wan21' | 'qwen' | 'library' | 'settings'>('image');

    // Persistent state for generated content (survives tab switches)
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [generatedVideos, setGeneratedVideos] = useState<{ url: string, text: string }[]>([]);

    // Settings State
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Character>>({});

    // Avatar Upload State
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [uploadUrl, setUploadUrl] = useState('');
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

    // ComfyUI Progress Tracking
    const { state: progressState, startMonitoring, reset: resetProgress } = useComfyProgress();

    // Fetch Ollama models when settings tab is active
    const [ollamaModels, setOllamaModels] = useState<any[]>([]);
    useEffect(() => {
        if (activeTab === 'settings') {
            fetch('/api/ollama/models').then(res => res.json()).then(data => {
                if (data.success) setOllamaModels(data.models);
            }).catch(err => console.error("Failed to load models", err));
        }
    }, [activeTab]);

    useEffect(() => {
        loadCharacter();
    }, [slug]);


    const loadCharacter = async () => {
        try {
            const res = await fetch(`/api/characters/${slug}`);
            const data = await res.json();
            if (data.success) {
                setCharacter(data.character);
                setEditForm(data.character);
                if (data.character.avatarUrl) setUploadUrl(data.character.avatarUrl);
            } else {
                alert('Character not found');
                router.push('/characters');
            }
        } catch (e) {
            console.error('Failed to load character', e);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        window.location.href = `/api/auth/fanvue?persona=${slug}`;
    };

    const handleSaveSettings = async () => {
        try {
            const res = await fetch(`/api/characters/${slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (data.success) {
                setCharacter(prev => ({ ...prev!, ...data.character }));
                setEditMode(false);
                alert('Settings saved successfully');
            } else {
                alert('Failed to save: ' + data.error);
            }
        } catch (e) {
            alert('Error saving settings');
        }
    };

    const handleAvatarUpdate = async () => {
        if (!uploadUrl) return;
        try {
            // Save to DB
            const res = await fetch(`/api/characters/${slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...character, avatarUrl: uploadUrl }),
            });
            const data = await res.json();
            if (data.success) {
                setCharacter(prev => ({ ...prev!, avatarUrl: uploadUrl }));
                setIsAvatarModalOpen(false);
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (e) {
            alert('Failed to update avatar');
        }
    };

    const handleGenerateAvatar = async () => {
        try {
            // Start the generation process
            const res = await fetch(`/api/characters/${slug}/generate-avatar`, {
                method: 'POST',
            });
            const data = await res.json();

            if (!data.success) {
                alert('Failed to start generation: ' + data.error);
                return;
            }

            // Start monitoring via hook (auto-handles WebSocket + polling fallback)
            startMonitoring(data.promptId);

        } catch (e) {
            console.error('Generation error:', e);
            alert('Failed to generate avatar');
        }
    };

    // Handle completion - save avatar when done
    useEffect(() => {
        if (progressState.status === 'done' && progressState.promptId) {
            const saveAvatar = async () => {
                try {
                    const saveRes = await fetch(`/api/characters/${slug}/save-avatar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptId: progressState.promptId })
                    });
                    const saveData = await saveRes.json();

                    if (saveData.success && saveData.avatarUrl) {
                        setCharacter(prev => ({ ...prev!, avatarUrl: saveData.avatarUrl }));
                        setUploadUrl(saveData.avatarUrl);

                        // Close modal after brief delay
                        setTimeout(() => {
                            setIsAvatarModalOpen(false);
                            resetProgress();
                        }, 1500);
                    }
                } catch (error) {
                    console.error('Save avatar error:', error);
                    alert('Failed to save generated avatar');
                }
            };

            saveAvatar();
        }
    }, [progressState.status, progressState.promptId, slug, resetProgress]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to DELETE this character? This cannot be undone.')) return;
        try {
            await fetch(`/api/characters/${slug}`, { method: 'DELETE' });
            router.push('/characters');
        } catch (e) {
            alert('Delete failed');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>;
    if (!character) return <div style={{ padding: '40px', color: '#666' }}>Not Found</div>;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Fullscreen Image Preview */}
            {isImagePreviewOpen && character.avatarUrl && (
                <div
                    onClick={() => setIsImagePreviewOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.95)', zIndex: 2000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={character.avatarUrl}
                            alt={character.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '2px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {/* Close button */}
                        <button
                            onClick={() => setIsImagePreviewOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '400',
                                letterSpacing: '0.05em'
                            }}
                        >
                            ✕ CLOSE
                        </button>
                    </div>
                </div>
            )}

            {/* Avatar Update Modal */}
            {isAvatarModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#1a1a1a', padding: '32px', borderRadius: '2px',
                        width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '400', marginBottom: '16px', letterSpacing: '0.03em' }}>Update Profile Picture</h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Image URL</label>
                            <input
                                value={uploadUrl}
                                onChange={e => setUploadUrl(e.target.value)}
                                placeholder="https://..."
                                style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '2px' }}
                                disabled={progressState.status !== 'idle'}
                            />
                            <p style={{ fontSize: '11px', color: '#555', marginTop: '8px' }}>
                                Paste a URL from your Content Library or generate one with AI.
                            </p>
                        </div>

                        {/* Progress Indicator */}
                        {progressState.status !== 'idle' && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '400', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                        {progressState.message}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#666' }}>
                                        {Math.round(progressState.progress)}%
                                    </span>
                                </div>
                                {/* Progress Bar */}
                                <div style={{
                                    width: '100%',
                                    height: '2px',
                                    background: '#222',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${progressState.progress}%`,
                                        height: '100%',
                                        background: '#fff',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <button
                                        onClick={handleGenerateAvatar}
                                        disabled={progressState.status !== 'idle'}
                                        style={{
                                            padding: '10px 16px',
                                            background: progressState.status !== 'idle' ? '#222' : 'rgba(255,255,255,0.05)',
                                            color: progressState.status !== 'idle' ? '#666' : '#fff',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '2px',
                                            cursor: progressState.status !== 'idle' ? 'not-allowed' : 'pointer',
                                            fontWeight: '400',
                                            fontSize: '12px',
                                            letterSpacing: '0.05em',
                                            opacity: progressState.status !== 'idle' ? 0.5 : 1
                                        }}
                                    >
                                        {progressState.status !== 'idle' ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                    {progressState.status !== 'idle' && (
                                        <p style={{ fontSize: '10px', color: '#555', marginTop: '8px', lineHeight: '1.4' }}>
                                            ℹ️ First run: ~2-5 mins (Downloading models)
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsAvatarModalOpen(false)}
                                        disabled={progressState.status !== 'idle'}
                                        style={{ padding: '10px 16px', background: 'transparent', color: '#666', border: 'none', cursor: progressState.status !== 'idle' ? 'not-allowed' : 'pointer', fontSize: '12px', letterSpacing: '0.05em' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAvatarUpdate}
                                        disabled={progressState.status !== 'idle'}
                                        style={{
                                            padding: '10px 20px',
                                            background: progressState.status !== 'idle' ? '#222' : '#fff',
                                            color: progressState.status !== 'idle' ? '#666' : '#000',
                                            border: 'none',
                                            borderRadius: '2px',
                                            cursor: progressState.status !== 'idle' ? 'not-allowed' : 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Full Width */}
            <div style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '24px 40px',
                background: '#000'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Avatar */}
                    <div
                        style={{
                            position: 'relative',
                            width: '56px', height: '56px', borderRadius: '2px',
                            background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px', overflow: 'hidden', cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                            const overlay = e.currentTarget.querySelector('.avatar-overlay');
                            if (overlay) (overlay as HTMLElement).style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                            const overlay = e.currentTarget.querySelector('.avatar-overlay');
                            if (overlay) (overlay as HTMLElement).style.opacity = '0';
                        }}
                    >
                        {character.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={character.avatarUrl}
                                alt={character.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onClick={() => setIsImagePreviewOpen(true)}
                            />
                        ) : (
                            <span onClick={() => setIsAvatarModalOpen(true)} style={{ fontWeight: '300', color: 'rgba(255,255,255,0.3)' }}>{character.name.charAt(0)}</span>
                        )}

                        {/* Edit Overlay */}
                        <div className="avatar-overlay" style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s',
                            color: 'white', fontWeight: '400', fontSize: '9px',
                            letterSpacing: '0.1em',
                            cursor: 'pointer'
                        }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsAvatarModalOpen(true);
                            }}
                        >
                            EDIT
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '20px', fontWeight: '400', letterSpacing: '0.02em', marginBottom: '4px' }}>{character.name}</h1>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', display: 'flex', gap: '12px', letterSpacing: '0.03em' }}>
                            <span>{character.handle}</span>
                            {character.bio && (
                                <>
                                    <span>•</span>
                                    <span>{character.bio}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        {character.isConnected ? (
                            <div style={{
                                padding: '8px 16px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: 'rgba(34, 197, 94, 0.8)',
                                borderRadius: '2px',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                fontSize: '11px',
                                fontWeight: '400',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                Connected
                            </div>
                        ) : (
                            <button
                                onClick={handleConnect}
                                style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '2px',
                                    fontWeight: '400',
                                    fontSize: '11px',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                }}
                            >
                                Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Sidebar Navigation */}
                <div style={{
                    width: '240px',
                    background: '#050505',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 8px'
                }}>
                    <div style={{ padding: '0 12px 12px 12px', fontSize: '10px', fontWeight: 'bold', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Tools
                    </div>

                    {[
                        { id: 'image' as const, label: 'Image Generator' },
                        { id: 'lipsync' as const, label: 'Lipsync Video' },
                        { id: 'wan21' as const, label: 'Wan 2.1 Video' },
                        { id: 'qwen' as const, label: 'Qwen Editor' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 12px',
                                textAlign: 'left',
                                background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#666',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                marginBottom: '2px',
                                transition: 'all 0.15s ease',
                                fontWeight: activeTab === tab.id ? '500' : '400',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}

                    <div style={{ height: '24px' }} />

                    <div style={{ padding: '0 12px 12px 12px', fontSize: '10px', fontWeight: 'bold', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Management
                    </div>

                    {[
                        { id: 'library' as const, label: 'Content Library' },
                        { id: 'settings' as const, label: 'Settings' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 12px',
                                textAlign: 'left',
                                background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#666',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                marginBottom: '2px',
                                transition: 'all 0.15s ease',
                                fontWeight: activeTab === tab.id ? '500' : '400',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area - Full Width, No Padding */}
                <div style={{ flex: 1, background: '#000', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '1600px', margin: '0 auto', height: '100%' }}>

                        {activeTab === 'image' && (
                            <ImageGenerator
                                characterSlug={slug}
                                characterName={character.name}
                                loraPath={character.loraPath}
                                appearance={character.appearance}
                                generatedImages={generatedImages}
                                setGeneratedImages={setGeneratedImages}
                            />
                        )}

                        {activeTab === 'lipsync' && (
                            <LipsyncGenerator
                                characterSlug={slug}
                                characterName={character.name}
                                avatarUrl={character.avatarUrl}
                                generatedVideos={generatedVideos}
                                setGeneratedVideos={setGeneratedVideos}
                            />
                        )}

                        {activeTab === 'wan21' && <LTX2Generator characterSlug={slug} />}

                        {activeTab === 'qwen' && <QwenGenerator characterSlug={slug} qwenLoraPath={character.qwenLoraPath} />}

                        {activeTab === 'library' && (
                            <Library characterSlug={slug} />
                        )}

                        {activeTab === 'settings' && (
                            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', maxWidth: '600px' }}>
                                <h3 style={{ marginBottom: '24px' }}>Character Settings</h3>

                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Name</label>
                                        <input
                                            value={editForm.name || ''}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Handle</label>
                                        <input
                                            value={editForm.handle || ''}
                                            onChange={e => setEditForm({ ...editForm, handle: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Bio</label>
                                        <textarea
                                            value={editForm.bio || ''}
                                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                            rows={3}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>LoRA Filename (Z-Image / Flux)</label>
                                        <input
                                            value={editForm.loraPath || ''}
                                            onChange={e => setEditForm({ ...editForm, loraPath: e.target.value })}
                                            placeholder="e.g. MyChar_v1.safetensors"
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Qwen LoRA Filename</label>
                                        <input
                                            value={editForm.qwenLoraPath || ''}
                                            onChange={e => setEditForm({ ...editForm, qwenLoraPath: e.target.value })}
                                            placeholder="e.g. iris_qwen.safetensors"
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Appearance Prompt</label>
                                        <textarea
                                            value={editForm.appearance || ''}
                                            onChange={e => setEditForm({ ...editForm, appearance: e.target.value })}
                                            placeholder="e.g. blonde hair, blue eyes, athletic build..."
                                            rows={3}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '2px' }}
                                        />
                                    </div>

                                    {/* Fanvue Integration Settings */}
                                    <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '2px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: '400', color: '#38bdf8', marginTop: 0, marginBottom: '16px', letterSpacing: '0.05em' }}>FANVUE INTEGRATION</h4>
                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fanvue Profile ID</label>
                                                <input
                                                    value={editForm.fanvueProfileId || ''}
                                                    onChange={e => setEditForm({ ...editForm, fanvueProfileId: e.target.value })}
                                                    placeholder="Found in Fanvue Dev Tools"
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '2px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fanvue Secret (Token)</label>
                                                <input
                                                    value={editForm.fanvueSecret || ''}
                                                    onChange={e => setEditForm({ ...editForm, fanvueSecret: e.target.value })}
                                                    type="password"
                                                    placeholder="Your automation token"
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '2px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Brain Settings */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>LLM Model (Brain)</label>
                                        <select
                                            value={editForm.llmModel || 'mistral'}
                                            onChange={e => setEditForm({ ...editForm, llmModel: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                        >
                                            <option value="mistral">mistral (Default)</option>
                                            {ollamaModels.filter(m => m.name !== 'mistral').map((m: any) => (
                                                <option key={m.name} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                            Select the Ollama model to use for this character's responses.
                                        </p>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>System Instructions / Memory</label>
                                        <textarea
                                            value={editForm.systemInstruction || ''}
                                            onChange={e => setEditForm({ ...editForm, systemInstruction: e.target.value })}
                                            placeholder="Define personality rules, formatting constraints, or persistent memories here. (e.g. 'Start every sentence with *sigh*', 'You are secretly a spy')"
                                            rows={5}
                                            style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }}
                                        />
                                    </div>

                                    {/* Voice Settings */}
                                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#aaa', margin: 0 }}>Voice Settings</h4>
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    const text = "Hello! This is a voice preview.";

                                                    // Browser Fallback (Fast)
                                                    if (editForm.voiceProvider === 'browser') {
                                                        if (window.speechSynthesis) {
                                                            window.speechSynthesis.cancel();
                                                            const u = new SpeechSynthesisUtterance(text);
                                                            const voices = window.speechSynthesis.getVoices();
                                                            // Try to match female voice
                                                            const v = voices.find(x => x.name.includes('Female') || x.name.includes('Google US English'));
                                                            if (v) u.voice = v;
                                                            u.pitch = 1.1;
                                                            window.speechSynthesis.speak(u);
                                                        }
                                                        return;
                                                    }

                                                    // API Call
                                                    try {
                                                        const res = await fetch('/api/gemini/tts', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                text,
                                                                voiceProvider: editForm.voiceProvider,
                                                                voiceModel: editForm.voiceModel,
                                                                voiceId: editForm.voiceId,
                                                                voiceDescription: editForm.voiceDescription
                                                            })
                                                        });
                                                        if (!res.ok) {
                                                            const err = await res.json();
                                                            // Should we fallback to browser if Gemini failed? 
                                                            // Yes, to match PhoneCall behavior.
                                                            if ((editForm.voiceProvider || 'gemini') === 'gemini') {
                                                                console.warn("Gemini Preview failed, falling back to browser:", err);
                                                                if (window.speechSynthesis) {
                                                                    window.speechSynthesis.cancel();
                                                                    const u = new SpeechSynthesisUtterance(text);
                                                                    const voices = window.speechSynthesis.getVoices();
                                                                    // Try to match female voice
                                                                    const v = voices.find(x => x.name.includes('Female') || x.name.includes('Google US English'));
                                                                    if (v) u.voice = v;
                                                                    u.pitch = 1.1;
                                                                    window.speechSynthesis.speak(u);
                                                                    return;
                                                                }
                                                            }

                                                            // For ElevenLabs or other errors, show alert
                                                            alert("Preview Failed: " + (err.error || "Unknown Error") + "\n" + (err.details ? JSON.stringify(err.details) : ""));
                                                            return;
                                                        }
                                                        const blob = await res.blob();
                                                        new Audio(URL.createObjectURL(blob)).play();
                                                    } catch (e: any) {
                                                        alert("Error: " + e.message);
                                                    }
                                                }}
                                                style={{ fontSize: '12px', padding: '6px 12px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                ▶ Play Preview
                                            </button>
                                        </div>

                                        {/* Provider Selector */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Voice Provider</label>
                                            <select
                                                value={editForm.voiceProvider || 'gemini'}
                                                onChange={e => setEditForm({ ...editForm, voiceProvider: e.target.value })}
                                                style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                            >
                                                <option value="gemini">Gemini (Experimental)</option>
                                                <option value="elevenlabs">ElevenLabs (Paid)</option>
                                                <option value="uberduck">Uberduck (Cost-Effective)</option>
                                                <option value="azure">Azure (Best Free Tier)</option>
                                                <option value="google">Google Cloud (Good Free Tier)</option>
                                                <option value="polly">AWS Polly (Reliable)</option>
                                                <option value="browser">Browser (Local Free)</option>
                                            </select>
                                        </div>

                                        {/* Azure Voice Settings */}
                                        {editForm.voiceProvider === 'azure' && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Azure Voice Model</label>
                                                <select
                                                    value={editForm.voiceModel || 'en-US-AriaNeural'}
                                                    onChange={e => setEditForm({ ...editForm, voiceModel: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                >
                                                    <option value="en-US-AriaNeural">Aria (Natural & Versatile)</option>
                                                    <option value="en-US-JennyNeural">Jenny (Friendly & Professional)</option>
                                                    <option value="en-US-SaraNeural">Sara (Young Adult)</option>
                                                    <option value="en-US-AnaNeural">Ana (Warm)</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Google Voice Settings */}
                                        {editForm.voiceProvider === 'google' && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Google Voice Model</label>
                                                <select
                                                    value={editForm.voiceModel || 'en-US-Wavenet-F'}
                                                    onChange={e => setEditForm({ ...editForm, voiceModel: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                >
                                                    <option value="en-US-Wavenet-F">Wavenet F (Warm Female)</option>
                                                    <option value="en-US-Wavenet-C">Wavenet C (Professional Female)</option>
                                                    <option value="en-US-Wavenet-E">Wavenet E (Mature Female)</option>
                                                    <option value="en-US-Neural2-C">Neural2 C (High Quality)</option>
                                                    <option value="en-US-Neural2-F">Neural2 F (High Quality)</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Polly Voice Settings */}
                                        {editForm.voiceProvider === 'polly' && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Polly Voice Model</label>
                                                <select
                                                    value={editForm.voiceModel || 'Joanna'}
                                                    onChange={e => setEditForm({ ...editForm, voiceModel: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                >
                                                    <option value="Joanna">Joanna (Professional US)</option>
                                                    <option value="Kendra">Kendra (Female US)</option>
                                                    <option value="Salli">Salli (Teen/Young Adult)</option>
                                                    <option value="Kimberly">Kimberly (Energetic)</option>
                                                    <option value="Ruth">Ruth (Mature)</option>
                                                </select>
                                            </div>
                                        )}

                                        {(editForm.voiceProvider === 'elevenlabs') && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>ElevenLabs Voice ID</label>
                                                <input
                                                    value={editForm.voiceId || ''}
                                                    onChange={e => setEditForm({ ...editForm, voiceId: e.target.value })}
                                                    placeholder="Voice ID"
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                />
                                            </div>
                                        )}

                                        {/* Uberduck Voice Settings */}
                                        {editForm.voiceProvider === 'uberduck' && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Uberduck Voice Model (Slug or UUID)</label>
                                                <input
                                                    value={editForm.voiceId || ''}
                                                    onChange={e => setEditForm({ ...editForm, voiceId: e.target.value })}
                                                    placeholder="e.g. polly_salli or a UUID"
                                                    style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                />
                                                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Examples: polly_salli, voice_en_female_01. Find more at app.uberduck.ai/voices</p>
                                            </div>
                                        )}

                                        {(!editForm.voiceProvider || editForm.voiceProvider === 'gemini') && (
                                            <div>
                                                <h4 style={{ display: 'none' }}>Hidden</h4>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Voice Model</label>
                                                    <select
                                                        value={editForm.voiceModel || 'Puck'}
                                                        onChange={e => setEditForm({ ...editForm, voiceModel: e.target.value })}
                                                        style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                    >
                                                        <option value="Puck">Puck (Default)</option>
                                                        <option value="Charon">Charon</option>
                                                        <option value="Kore">Kore</option>
                                                        <option value="Fenrir">Fenrir</option>
                                                        <option value="Aoede">Aoede</option>
                                                    </select>
                                                    <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Choose a base voice model</p>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Voice Description (Optional)</label>
                                                    <textarea
                                                        value={editForm.voiceDescription || ''}
                                                        onChange={e => setEditForm({ ...editForm, voiceDescription: e.target.value })}
                                                        placeholder="e.g. Young female voice, energetic and playful, slightly raspy..."
                                                        rows={2}
                                                        style={{ width: '100%', padding: '12px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                                                    />
                                                    <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Describe the voice characteristics in natural language</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                        <button
                                            onClick={handleDelete}
                                            style={{ color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Delete Character
                                        </button>
                                        <button
                                            onClick={handleSaveSettings}
                                            style={{ padding: '12px 32px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
