'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('api');

    const tabs = [
        { id: 'api', label: '🔧 API Settings', icon: '🔧' },
        { id: 'integrations', label: '🔌 Integrations', icon: '🔌' },
        { id: 'system', label: '⚙️ System', icon: '⚙️' },
    ];

    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === 'api') {
            router.push('/settings/api');
        }
    };

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '40px 20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: '32px',
                color: 'white'
            }}>
                Settings
            </h1>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '32px',
                borderBottom: '1px solid #333',
                paddingBottom: '0'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        style={{
                            padding: '12px 24px',
                            background: activeTab === tab.id ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            color: activeTab === tab.id ? 'white' : '#888',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{
                background: '#0a0a0a',
                borderRadius: '12px',
                padding: '32px',
                minHeight: '400px'
            }}>
                {activeTab === 'api' && (
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
                            🔧 API Configuration
                        </h2>
                        <p style={{ color: '#aaa', marginBottom: '24px' }}>
                            Click below to configure all API keys and endpoints
                        </p>
                        <button
                            onClick={() => router.push('/settings/api')}
                            style={{
                                padding: '16px 32px',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Open API Settings →
                        </button>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
                            🔌 Platform Integrations
                        </h2>
                        <p style={{ color: '#888' }}>
                            Connect to social media platforms and content distribution services
                        </p>
                        <p style={{ color: '#666', marginTop: '20px', fontStyle: 'italic' }}>
                            Coming soon: FanVue, TikTok, Instagram, X/Twitter auto-posting
                        </p>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', marginBottom: '24px' }}>
                            ⚙️ System Status
                        </h2>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                border: '1px solid #333'
                            }}>
                                <span style={{ color: '#ccc' }}>ComfyUI</span>
                                <span style={{ color: '#4ade80' }}>● Running</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                border: '1px solid #333'
                            }}>
                                <span style={{ color: '#ccc' }}>VoxCPM</span>
                                <span style={{ color: '#4ade80' }}>● Running</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                border: '1px solid #333'
                            }}>
                                <span style={{ color: '#ccc' }}>Ollama</span>
                                <span style={{ color: '#4ade80' }}>● Running</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
