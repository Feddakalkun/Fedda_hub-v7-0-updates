'use client';

import { useState, useEffect } from 'react';

interface ApiConfig {
    geminiApiKey: string;
    comfyuiUrl: string;
    voxcpmUrl: string;
    ollamaUrl: string;
}

export default function ApiSettingsPage() {
    const [config, setConfig] = useState<ApiConfig>({
        geminiApiKey: '',
        comfyuiUrl: 'http://localhost:8188',
        voxcpmUrl: 'http://localhost:7860',
        ollamaUrl: 'http://localhost:11435',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/settings/api');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (err) {
            console.error('Failed to load API config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('/api/settings/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                setMessage('✅ Settings saved successfully!');
            } else {
                setMessage('❌ Failed to save settings');
            }
        } catch (err) {
            setMessage('❌ Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (service: string) => {
        setMessage(`Testing ${service}...`);
        try {
            let testUrl = '';
            if (service === 'gemini') {
                testUrl = '/api/settings/test-gemini';
            } else if (service === 'comfyui') {
                testUrl = '/api/settings/test-comfyui';
            } else if (service === 'voxcpm') {
                testUrl = '/api/settings/test-voxcpm';
            } else if (service === 'ollama') {
                testUrl = '/api/settings/test-ollama';
            }

            const res = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${service} connection successful!`);
            } else {
                setMessage(`❌ ${service} test failed: ${data.error}`);
            }
        } catch (err: any) {
            setMessage(`❌ ${service} test error: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                Loading API settings...
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '40px 20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: '10px',
                color: 'white'
            }}>
                🔧 API Settings
            </h1>
            <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '14px' }}>
                Centralized configuration for all API services. All features will use these settings.
            </p>

            {message && (
                <div style={{
                    padding: '16px',
                    marginBottom: '24px',
                    background: message.startsWith('✅') ? '#1a472a' : '#4a1a1a',
                    border: `1px solid ${message.startsWith('✅') ? '#2d7a3f' : '#7a2d2d'}`,
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                }}>
                    {message}
                </div>
            )}

            {/* Gemini API */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>✨</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: 0 }}>
                        Gemini AI
                    </h2>
                </div>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>
                    Free TTS, image analysis, and AI chat. Get your key from{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" style={{ color: '#8b5cf6' }}>
                        Google AI Studio
                    </a>
                </p>
                <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={config.geminiApiKey}
                    onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'black',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        marginBottom: '12px'
                    }}
                />
                <button
                    onClick={() => handleTest('gemini')}
                    style={{
                        padding: '10px 20px',
                        background: '#8b5cf6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Test Connection
                </button>
            </div>

            {/* ComfyUI */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>🎨</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: 0 }}>
                        ComfyUI
                    </h2>
                </div>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>
                    Local image & video generation server
                </p>
                <input
                    type="text"
                    placeholder="http://localhost:8188"
                    value={config.comfyuiUrl}
                    onChange={(e) => setConfig({ ...config, comfyuiUrl: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'black',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        marginBottom: '12px'
                    }}
                />
                <button
                    onClick={() => handleTest('comfyui')}
                    style={{
                        padding: '10px 20px',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Test Connection
                </button>
            </div>

            {/* VoxCPM */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>🎤</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: 0 }}>
                        VoxCPM
                    </h2>
                </div>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>
                    Local voice cloning & TTS (uncensored)
                </p>
                <input
                    type="text"
                    placeholder="http://localhost:7860"
                    value={config.voxcpmUrl}
                    onChange={(e) => setConfig({ ...config, voxcpmUrl: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'black',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        marginBottom: '12px'
                    }}
                />
                <button
                    onClick={() => handleTest('voxcpm')}
                    style={{
                        padding: '10px 20px',
                        background: '#f59e0b',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Test Connection
                </button>
            </div>

            {/* Ollama */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '32px',
                border: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>🧠</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: 0 }}>
                        Ollama
                    </h2>
                </div>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px' }}>
                    Local LLM & vision models
                </p>
                <input
                    type="text"
                    placeholder="http://localhost:11435"
                    value={config.ollamaUrl}
                    onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'black',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        marginBottom: '12px'
                    }}
                />
                <button
                    onClick={() => handleTest('ollama')}
                    style={{
                        padding: '10px 20px',
                        background: '#6366f1',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Test Connection
                </button>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: saving ? '#333' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {saving ? 'Saving...' : '💾 Save All Settings'}
            </button>

            <p style={{
                marginTop: '24px',
                padding: '20px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#888',
                fontSize: '13px',
                lineHeight: '1.6'
            }}>
                <strong style={{ color: '#aaa' }}>ℹ️ Important:</strong><br />
                All features (TTS, image generation, lipsync, chat, etc.) will use these API settings.
                Make sure to test each connection before using the features.
            </p>
        </div>
    );
}
