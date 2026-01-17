'use client';

import { useState } from 'react';

interface VoiceGeneratorProps {
    characterSlug: string;
    characterName: string;
    voiceId?: string;
    voiceProvider?: string;
}

export default function VoiceGenerator({
    characterSlug,
    characterName,
    voiceId,
    voiceProvider
}: VoiceGeneratorProps) {
    const [text, setText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<{ text: string, url: string, timestamp: number }[]>([]);

    const handleGenerate = async () => {
        if (!text.trim()) return;

        setIsGenerating(true);
        try {
            const res = await fetch('/api/gemini/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voiceProvider: voiceProvider || 'elevenlabs',
                    voiceId: voiceId
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to generate audio');
            }

            // Create blob from audio response
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            setAudioUrl(url);
            setHistory(prev => [{ text, url, timestamp: Date.now() }, ...prev]);

            // Auto play
            const audio = new Audio(url);
            audio.play();

        } catch (error: any) {
            console.error('TPS Error:', error);
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: '100%' }}>
            {/* Left Panel - Input */}
            <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                        Voice Generator (Phone)
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Generate audio messages using {voiceProvider || 'ElevenLabs'}
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                        Text to Speak
                    </label>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={`What should ${characterName} say?`}
                        rows={6}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'black',
                            border: '1px solid #333',
                            color: 'white',
                            borderRadius: '12px',
                            resize: 'vertical',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !text.trim()}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            background: isGenerating ? '#333' : '#fff',
                            color: isGenerating ? '#888' : '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '15px'
                        }}
                    >
                        {isGenerating ? 'Generating...' : 'Generate Audio'}
                    </button>

                    {audioUrl && (
                        <button
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = audioUrl;
                                a.download = `${characterSlug}_audio_${Date.now()}.mp3`;
                                a.click();
                            }}
                            style={{
                                padding: '14px',
                                background: '#222',
                                color: 'white',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                            title="Download last audio"
                        >
                            ⬇️
                        </button>
                    )}
                </div>

                {isGenerating && (
                    <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
                        Generating voice... this takes a few seconds...
                    </div>
                )}
            </div>

            {/* Right Panel - History */}
            <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                overflowY: 'auto',
                maxHeight: '600px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                    History ({history.length})
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {history.map((item, i) => (
                        <div key={i} style={{
                            padding: '16px',
                            background: '#111',
                            borderRadius: '12px',
                            border: '1px solid #333'
                        }}>
                            <div style={{ marginBottom: '12px', fontSize: '14px', color: '#ccc', fontStyle: 'italic' }}>
                                "{item.text}"
                            </div>
                            <audio
                                controls
                                src={item.url}
                                style={{ width: '100%', height: '32px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = item.url;
                                        a.download = `${characterSlug}_audio_${item.timestamp}.mp3`;
                                        a.click();
                                    }}
                                    style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Download MP3
                                </button>
                            </div>
                        </div>
                    ))}

                    {history.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                            No generated audio yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
