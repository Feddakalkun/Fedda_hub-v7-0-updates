'use client';

import { useState, useRef } from 'react';

interface QwenGeneratorProps {
    characterSlug?: string;
    qwenLoraPath?: string;
}

const uploadToComfy = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/comfyui/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return await res.json(); // { name: ... }
};

export default function QwenGenerator({ characterSlug, qwenLoraPath }: QwenGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [img1, setImg1] = useState<File | null>(null);
    const [refImages, setRefImages] = useState<File[]>([]); // Multiple Refs
    const [width, setWidth] = useState(1024);
    const [height, setHeight] = useState(1024);

    const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg]);

    const handleAddRef = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            if (refImages.length >= 3) return;
            setRefImages([...refImages, e.target.files[0]]);
        }
    };

    const handleRemoveRef = (index: number) => {
        setRefImages(refImages.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!prompt && !img1) {
            alert("Please provide at least a prompt or source image.");
            return;
        }

        try {
            setStatus('uploading');
            addLog("Uploading images...");

            let img1Name = null;
            const refNames: string[] = [];

            if (img1) {
                const res = await uploadToComfy(img1);
                img1Name = res.name;
                addLog(`Uploaded Source: ${res.name}`);
            }

            for (const ref of refImages) {
                const res = await uploadToComfy(ref);
                refNames.push(res.name);
                addLog(`Uploaded Ref: ${res.name}`);
            }

            setStatus('generating');
            addLog(`Sending to Qwen with ${refNames.length} refs...`);

            const res = await fetch('/api/comfyui/qwen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    image1: img1Name,
                    refImages: refNames, // Send Array
                    qwenLoraPath,
                    width,
                    height
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to start generation');

            addLog(`Job Started: ${data.promptId}`);
            setStatus('success');
            // Here we could poll for the result, but for V1 we'll just notify
            addLog("Check Library for results!");

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            addLog(`Error: ${e.message}`);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Info */}
                {qwenLoraPath && (
                    <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontSize: '11px', color: '#888' }}>
                        Using Qwen Identity: <br />{qwenLoraPath.split(/[/\\]/).pop()}
                    </div>
                )}

                {/* Image 1: Source */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Source Image (Target) *</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setImg1(e.target.files?.[0] || null)}
                        style={{ fontSize: '12px' }}
                    />
                    {img1 && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px' }}>Selected: {img1.name}</div>}
                </div>

                {/* Multiple Reference Images */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Reference Images (Optional, Max 3)</label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {refImages.map((file, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#222', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{file.name}</span>
                                <button onClick={() => handleRemoveRef(idx)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </div>
                        ))}
                    </div>

                    {refImages.length < 3 && (
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAddRef}
                            style={{ fontSize: '12px', marginTop: '8px' }}
                        />
                    )}
                </div>

                {/* Dimensions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#888' }}>Width</label>
                        <input
                            type="number" value={width} onChange={e => setWidth(Number(e.target.value))}
                            style={{ width: '100%', background: '#222', border: '1px solid #333', color: 'white', padding: '8px', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#888' }}>Height</label>
                        <input
                            type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
                            style={{ width: '100%', background: '#222', border: '1px solid #333', color: 'white', padding: '8px', borderRadius: '4px' }}
                        />
                    </div>
                </div>

                {/* Prompt */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#888' }}>Edit Instruction</label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. Turn the man into a cyberpunk cyborg"
                        rows={4}
                        style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={status === 'uploading' || status === 'generating'}
                    style={{
                        padding: '12px',
                        background: status === 'generating' ? '#444' : '#fff',
                        color: status === 'generating' ? '#666' : '#000',
                        border: 'none', borderRadius: '8px',
                        cursor: status === 'generating' ? 'wait' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {status === 'generating' ? 'Generating...' : status === 'uploading' ? 'Uploading...' : 'Run Qwen Edit'}
                </button>

                {/* Logs */}
                <div style={{ background: 'black', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#aaa', minHeight: '60px' }}>
                    {logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>

            {/* Preview Area (Simplified) */}
            <div style={{ background: '#111', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', border: '1px dashed #333' }}>
                <div style={{ textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px', color: '#444' }}>Preview</div>
                    <p>Generated images will appear in the Library</p>
                    <p style={{ fontSize: '12px' }}>(Real-time preview coming soon)</p>
                </div>
            </div>
        </div>
    );
}
