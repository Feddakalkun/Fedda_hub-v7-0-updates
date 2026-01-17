'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

export default function LandingPage() {
    const [comfyReady, setComfyReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing...');

    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes max wait

        const checkComfyUI = async () => {
            try {
                // Use our own API to check ComfyUI (avoids CORS)
                const res = await fetch('/api/comfyui/models', {
                    method: 'GET',
                    cache: 'no-store'
                });

                if (res.ok) {
                    setComfyReady(true);
                    setStatusMessage('Ready');
                    return true;
                }
            } catch (e) {
                // ComfyUI not ready yet
                console.log('ComfyUI check failed:', e);
            }

            attempts++;
            if (attempts < maxAttempts) {
                setStatusMessage(`Loading ComfyUI... (${attempts}s)`);
                setTimeout(checkComfyUI, 1000);
            } else {
                setStatusMessage('ComfyUI timeout - please restart');
            }
        };

        // Start checking after a brief delay
        setTimeout(checkComfyUI, 2000);
    }, []);

    return (
        <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            {/* Background Video */}
            <video
                key={comfyReady ? 'ready' : 'loading'} // Force re-render on state change
                autoPlay
                loop
                muted
                playsInline
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.6,
                    filter: 'grayscale(100%) contrast(1.2)',
                    animation: 'videoFadeIn 1s ease-in'
                }}
            >
                <source src={comfyReady ? '/done-loading.mp4' : '/bg.mp4'} type="video/mp4" />
            </video>

            <style>{`
                @keyframes videoFadeIn {
                    from { opacity: 0; }
                    to { opacity: 0.6; }
                }
            `}</style>

            {/* Overlay Gradient */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
                zIndex: 1
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>

                {/* Logo / Header */}
                <div>
                    <h1 style={{
                        fontSize: '64px',
                        fontWeight: '800',
                        letterSpacing: '0.15em',
                        margin: 0,
                        textTransform: 'uppercase',
                        background: 'linear-gradient(180deg, #fff 0%, #aaa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        FEDDAKALKUN
                    </h1>
                    <h2 style={{
                        marginTop: '-10px',
                        fontSize: '24px',
                        fontWeight: '300',
                        letterSpacing: '0.5em',
                        color: '#666',
                        textTransform: 'uppercase'
                    }}>
                        WORKSTATION
                    </h2>
                </div>



                {/* Status Indicator */}
                {!comfyReady && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(255,255,255,0.2)',
                            borderTop: '3px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                        <p style={{
                            fontSize: '12px',
                            color: '#999',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase'
                        }}>
                            {statusMessage}
                        </p>
                        {/* FIRST RUN NOTE */}
                        <p style={{
                            fontSize: '10px',
                            color: '#555',
                            marginTop: '0px',
                            maxWidth: '280px',
                            textAlign: 'center',
                            lineHeight: '1.4'
                        }}>
                            First launch may take 2-5 minutes initializing AI engines.
                        </p>
                    </div>
                )}

                {/* CTA Button - Premium Design */}
                {comfyReady ? (
                    <Link href="/characters">
                        <button
                            style={{
                                marginTop: '64px',
                                padding: '20px 80px',
                                background: 'transparent',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                letterSpacing: '0.3em',
                                textTransform: 'uppercase',
                                border: '2px solid white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 0 40px rgba(255,255,255,0.15)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.color = 'black';
                                e.currentTarget.style.boxShadow = '0 0 60px rgba(255,255,255,0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.15)';
                            }}
                        >
                            Enter Studio
                        </button>
                    </Link>
                ) : (
                    <button
                        disabled
                        style={{
                            marginTop: '64px',
                            padding: '20px 80px',
                            background: 'transparent',
                            color: '#666',
                            fontSize: '14px',
                            fontWeight: 500,
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            border: '2px solid #333',
                            cursor: 'not-allowed',
                            opacity: 0.4,
                        }}
                    >
                        Loading...
                    </button>
                )}

            </div>



        </main>
    );
}
