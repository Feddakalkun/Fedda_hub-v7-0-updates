'use client';

import { useState, useEffect } from 'react';
import { useComfyProgress } from '@/hooks/useComfyProgress';
import Library from './Library';

interface LTX2GeneratorProps {
    characterSlug: string;
}

export default function LTX2Generator({ characterSlug }: LTX2GeneratorProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Cinematic camera pan, subtle movement');
    const [resolution, setResolution] = useState<number>(512); // 256, 512, 768, 1024
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

    // ComfyUI Progress Tracking
    const { state: progressState, startMonitoring, reset: resetProgress } = useComfyProgress();

    // Check localStorage for image sent from Library
    useEffect(() => {
        const storedImage = localStorage.getItem('wan21InputImage');
        if (storedImage) {
            setSelectedImage(storedImage);
            // Clear it so it doesn't auto-populate again
            localStorage.removeItem('wan21InputImage');
        }
    }, []);

    // 1. Handle Generation
    const handleGenerate = async () => {
        if (!selectedImage) return alert('Please select a source image!');
        if (!prompt) return alert('Please enter a prompt!');

        try {
            // Generate using Wan 2.1
            const imageFilename = selectedImage;

            const res = await fetch('/api/comfyui/wan21', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    imageFilename,
                    resolution,
                    seed: Math.floor(Math.random() * 1000000000)
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            setGeneratedVideo(null);
            startMonitoring(data.promptId);

        } catch (e: any) {
            alert('Generation failed: ' + e.message);
        }
    };

    // 2. Handle Completion (Polling for the output video)
    const fetchLatestOutput = async (promptId: string) => {
        const res = await fetch(`/api/comfyui/history?promptId=${promptId}`);
        const data = await res.json();
        if (data.outputs) {
            // Look for video output
            const outputKeys = Object.keys(data.outputs);
            for (const key of outputKeys) {
                const outputs = data.outputs[key].gifs || data.outputs[key].videos; // check both
                if (outputs && outputs.length > 0) {
                    return `/api/comfyui/view?filename=${outputs[0].filename}&type=${outputs[0].type}&subfolder=${outputs[0].subfolder}`;
                }
            }
        }
        return null;
    };

    useEffect(() => {
        if (progressState.status === 'done' && progressState.promptId) {
            fetchLatestOutput(progressState.promptId).then(url => {
                if (url) setGeneratedVideo(url);

                // Allow "Complete" to show briefly then reset so button is clickable
                setTimeout(() => {
                    resetProgress();
                }, 1000);
            });
        }
    }, [progressState.status, progressState.promptId, resetProgress]);


    // 3. Save to Library
    const handleSave = async () => {
        if (!generatedVideo) return;

        try {
            const res = await fetch(`/api/characters/${characterSlug}/save-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl: generatedVideo,
                    // We can pass prompt too if we update the endpoint, but usually it's embedded or separate
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Saved to Library! 🎬');
            } else {
                alert('Failed to save: ' + data.error);
            }
        } catch (e) {
            alert('Save failed');
        }
    };

    return (
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '20px' }}>Wan 2.1 Video Generator</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Left: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Source Image Selection */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                            1. Source Image
                        </label>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            {/* Preview */}
                            <div style={{
                                width: '120px', height: '160px',
                                background: '#111', borderRadius: '8px',
                                border: '1px dashed #444', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {selectedImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedImage} alt="Source" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '24px', color: '#666' }}>No Image</span>
                                )}
                            </div>

                            <button
                                onClick={() => setIsLibraryOpen(true)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px',
                                    background: '#333', color: 'white', border: 'none',
                                    cursor: 'pointer', fontSize: '13px'
                                }}
                            >
                                Select from Library
                            </button>
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                            2. Motion Prompt
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the camera movement and action..."
                            rows={4}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: 'black', border: '1px solid #333', color: 'white'
                            }}
                        />
                    </div>

                    {/* Resolution Selector */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                            3. Resolution
                        </label>
                        <select
                            value={resolution}
                            onChange={(e) => setResolution(parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'black',
                                border: '1px solid #333',
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="256">256 × 256 (Fast)</option>
                            <option value="512">512 × 512 (Balanced)</option>
                            <option value="768">768 × 768 (High Quality)</option>
                            <option value="1024">1024 × 1024 (Ultra)</option>
                        </select>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={progressState.status !== 'idle' || !selectedImage}
                        style={{
                            padding: '16px', borderRadius: '8px',
                            background: progressState.status !== 'idle' ? '#444' : '#fff',
                            color: progressState.status !== 'idle' ? '#666' : '#000',
                            border: 'none', fontWeight: 'bold', fontSize: '16px',
                            cursor: progressState.status !== 'idle' ? 'not-allowed' : 'pointer',
                            opacity: (!selectedImage) ? 0.5 : 1
                        }}
                    >
                        {progressState.status !== 'idle' ? 'Generating Video...' : 'Generate Video'}
                    </button>

                    {/* Progress Bar */}
                    {progressState.status !== 'idle' && (
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span>{progressState.message}</span>
                                <span>{Math.round(progressState.progress)}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#222', borderRadius: '3px' }}>
                                <div style={{ width: `${progressState.progress}%`, height: '100%', background: '#fff', transition: 'width 0.3s' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Output */}
                <div style={{ background: '#111', borderRadius: '12px', padding: '20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {generatedVideo ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <video
                                src={generatedVideo}
                                controls
                                autoPlay
                                loop
                                style={{ width: '100%', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleSave}
                                    style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Save to Library
                                </button>
                                <a
                                    href={generatedVideo}
                                    download="wan21_video.mp4"
                                    style={{ flex: 1, padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'center', textDecoration: 'none' }}
                                >
                                    Download
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#444' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px', color: '#444' }}>Video Preview</div>
                            <p>Generated video will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Library Modal */}
            {isLibraryOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.9)', zIndex: 2000,
                    padding: '40px', overflowY: 'auto'
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
                        <button
                            onClick={() => setIsLibraryOpen(false)}
                            style={{
                                position: 'fixed', top: '20px', right: '40px',
                                background: '#333', color: 'white', border: 'none',
                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', zIndex: 2100
                            }}
                        >
                            Close Library
                        </button>

                        <h2 style={{ color: 'white', marginBottom: '20px' }}>Select Source Image</h2>

                        <Library
                            characterSlug={characterSlug}
                            onSelect={(url) => {
                                setSelectedImage(url);
                                setIsLibraryOpen(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
