'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkflowClip, WorkflowChainSession } from '@/types/workflow-chain';

export default function WorkflowChainBuilder() {
    const [session, setSession] = useState<WorkflowChainSession>({
        id: `session_${Date.now()}`,
        name: 'Untitled Project',
        clips: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    });

    const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
    const [savedSessions, setSavedSessions] = useState<WorkflowChainSession[]>([]);
    const [showSessions, setShowSessions] = useState(false);

    // Processing states
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCombining, setIsCombining] = useState(false);
    const [combineProgress, setCombineProgress] = useState(0);

    // Ollama states
    const [isTagging, setIsTagging] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancedPrompt, setEnhancedPrompt] = useState('');

    const selectedClip = selectedClipIndex !== null ? session.clips[selectedClipIndex] : null;

    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (session.clips.length > 0) {
                handleSaveSession(true); // Silent save
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [session]);

    // Load available sessions on mount
    useEffect(() => {
        loadSessions();

        // Check for URL parameters to add clips directly
        const params = new URLSearchParams(window.location.search);
        const addImage = params.get('addImage');
        const addVideo = params.get('addVideo');
        const videoType = params.get('type') as 'lipsync' | 'wan21' | null;
        const videoText = params.get('text');

        if (addImage) {
            const newClip: WorkflowClip = {
                id: `clip_${Date.now()}`,
                type: 'image',
                url: decodeURIComponent(addImage),
                timestamp: Date.now(),
                metadata: {}
            };

            setSession(prev => ({
                ...prev,
                clips: [...prev.clips, newClip],
                updatedAt: Date.now()
            }));

            // Clean URL
            window.history.replaceState({}, '', '/tools/workflow-chain');
        }

        if (addVideo && videoType) {
            const newClip: WorkflowClip = {
                id: `clip_${Date.now()}`,
                type: videoType,
                url: decodeURIComponent(addVideo),
                prompt: videoText ? decodeURIComponent(videoText) : undefined,
                timestamp: Date.now(),
                metadata: {}
            };

            setSession(prev => ({
                ...prev,
                clips: [...prev.clips, newClip],
                updatedAt: Date.now()
            }));

            // Clean URL
            window.history.replaceState({}, '', '/tools/workflow-chain');
        }
    }, []);

    const loadSessions = async () => {
        try {
            const res = await fetch('/api/workflow-chain/load');
            const data = await res.json();
            if (data.success) {
                setSavedSessions(data.sessions || []);
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    };

    const handleSaveSession = async (silent = false) => {
        try {
            const res = await fetch('/api/workflow-chain/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });

            const data = await res.json();
            if (data.success) {
                if (!silent) {
                    alert(`Session "${session.name}" saved successfully!`);
                }
                loadSessions(); // Refresh session list
            } else {
                if (!silent) {
                    alert('Failed to save: ' + data.error);
                }
            }
        } catch (err) {
            console.error('Save error:', err);
            if (!silent) {
                alert('Failed to save session');
            }
        }
    };

    const handleLoadSession = async (sessionId: string) => {
        try {
            const res = await fetch(`/api/workflow-chain/load?id=${sessionId}`);
            const data = await res.json();

            if (data.success) {
                setSession(data.session);
                setSelectedClipIndex(null);
                setShowSessions(false);
                alert(`Loaded session: ${data.session.name}`);
            } else {
                alert('Failed to load: ' + data.error);
            }
        } catch (err) {
            console.error('Load error:', err);
            alert('Failed to load session');
        }
    };

    const handleNewSession = () => {
        if (session.clips.length > 0) {
            if (!confirm('Start a new session? Unsaved changes will be lost.')) {
                return;
            }
        }

        setSession({
            id: `session_${Date.now()}`,
            name: 'Untitled Project',
            clips: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        setSelectedClipIndex(null);
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm('Delete this session permanently?')) return;

        try {
            const res = await fetch(`/api/workflow-chain/delete?id=${sessionId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                loadSessions();
                alert('Session deleted');
            } else {
                alert('Failed to delete: ' + data.error);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete session');
        }
    };

    // Helper function to convert voice preset to instruction
    const getVoiceInstruction = (preset: string): string => {
        const instructions: Record<string, string> = {
            'sultry': 'Speak in a sultry, seductive female voice with a breathy quality and slow deliberate pacing',
            'professional': 'Speak in a professional, confident female voice with clear articulation',
            'playful': 'Speak in a playful, energetic female voice with warmth and charm',
            'mysterious': 'Speak in a mysterious, alluring female voice with a soft whisper-like quality',
            'passionate': 'Speak in a passionate, intense female voice with dramatic flair',
            'sweet': 'Speak in a sweet, friendly female voice with a bright cheerful tone',
            'confident': 'Speak in a confident, commanding female voice with strong projection',
            'gentle': 'Speak in a gentle, soft female voice with a calming ethereal quality',
        };
        return instructions[preset] || instructions['sultry'];
    };

    // Lipsync generation states
    const [showLipsyncModal, setShowLipsyncModal] = useState(false);
    const [lipsyncText, setLipsyncText] = useState('');
    const [ttsProvider, setTtsProvider] = useState<'voxcpm' | 'gemini'>('voxcpm'); // Default to Gemini (free & customizable)
    const [selectedVoice, setSelectedVoice] = useState('sultry'); // Gemini voice instruction preset
    const [isGeneratingLipsync, setIsGeneratingLipsync] = useState(false);
    const [lipsyncProgress, setLipsyncProgress] = useState(0);
    const [lipsyncResolution, setLipsyncResolution] = useState('256'); // Start with 256 for speed

    const handleSendToLipsync = () => {
        if (!selectedClip) return;
        setShowLipsyncModal(true);
        setLipsyncText('');
    };

    const handleGenerateLipsync = async () => {
        if (!lipsyncText.trim() || !selectedClip) {
            alert('Please enter text for lipsync generation');
            return;
        }

        setIsGeneratingLipsync(true);
        setLipsyncProgress(10);

        try {
            // Use the original clip URL instead of extracted frame (more reliable!)
            const frameUrl = selectedClip.url;

            // Step 1: Generate Audio (Gemini or VoxCPM)
            setLipsyncProgress(20);
            const apiUrl = ttsProvider === 'gemini' ? '/api/gemini-tts' : '/api/voxcpm/generate';
            const audioRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    ttsProvider === 'gemini'
                        ? { text: lipsyncText, voiceInstruction: getVoiceInstruction(selectedVoice) }
                        : { text: lipsyncText, voicePath: `voices/${selectedVoice}` }
                ),
            });

            let audioUrl: string;

            if (ttsProvider === 'gemini') {
                // Gemini returns raw audio bytes, not JSON
                if (!audioRes.ok) {
                    const errorData = await audioRes.json();
                    throw new Error('Gemini TTS failed: ' + (errorData.error || audioRes.statusText));
                }

                // Convert binary response to blob and upload to server
                const audioBlob = await audioRes.blob();
                const formData = new FormData();
                formData.append('audio', audioBlob, 'gemini-audio.mp3');

                // Upload to server for ComfyUI to access
                const uploadRes = await fetch('/api/upload/audio', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload Gemini audio');
                }

                const uploadData = await uploadRes.json();
                audioUrl = uploadData.url;
                console.log('[Lipsync] Gemini audio uploaded:', audioUrl);
            } else {
                // VoxCPM returns JSON with audioUrl
                const audioData = await audioRes.json();
                if (!audioData.success) {
                    throw new Error('VoxCPM failed: ' + audioData.error);
                }
                audioUrl = audioData.audioUrl;
            }
            setLipsyncProgress(50);

            // Step 2: Generate Lipsync Video with ComfyUI
            const videoRes = await fetch('/api/comfyui/animate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterSlug: 'workflow-chain',
                    referenceImage: frameUrl,
                    audioUrl: audioUrl,
                    resolution: lipsyncResolution,
                }),
            });

            const videoData = await videoRes.json();
            if (!videoData.success) {
                throw new Error('Video generation failed: ' + videoData.error);
            }

            setLipsyncProgress(80);

            // Poll for completion
            const pid = videoData.promptId || videoData.prompt_id;
            if (!pid) {
                throw new Error("No prompt ID received from backend");
            }

            await pollForLipsyncCompletion(pid);

        } catch (e: any) {
            console.error('Lipsync generation error:', e);
            alert('Failed to generate lipsync video: ' + e.message);
            setIsGeneratingLipsync(false);
            setLipsyncProgress(0);
        }
    };

    const pollForLipsyncCompletion = async (promptId: string) => {
        const maxAttempts = 200;
        let attempts = 0;

        const checkStatus = async (): Promise<void> => {
            try {
                console.log(`[Lipsync Poll] Checking status... (attempt ${attempts + 1}/${maxAttempts})`);
                const res = await fetch(`/api/comfyui/status/${promptId}`);
                const data = await res.json();

                console.log(`[Lipsync Poll] Status:`, data.status);

                if (data.status === 'done' && data.videoUrl) {
                    console.log(`[Lipsync Poll] ✅ Complete! Video URL:`, data.videoUrl);
                    // Add the lipsync video to the workflow
                    const newClip: WorkflowClip = {
                        id: `clip_${Date.now()}`,
                        type: 'lipsync',
                        url: data.videoUrl,
                        prompt: lipsyncText,
                        audioUrl: data.videoUrl,
                        timestamp: Date.now(),
                        metadata: {}
                    };

                    setSession(prev => ({
                        ...prev,
                        clips: [...prev.clips, newClip],
                        updatedAt: Date.now()
                    }));

                    setLipsyncProgress(100);
                    setTimeout(() => {
                        setIsGeneratingLipsync(false);
                        setLipsyncProgress(0);
                        setShowLipsyncModal(false);
                        alert('Lipsync video generated and added to timeline!');
                    }, 1000);
                    return;
                }

                if (data.status === 'error') {
                    console.error(`[Lipsync Poll] ❌ Error:`, data.error);
                    throw new Error(data.error || 'Video generation failed');
                }

                // Continue polling
                attempts++;
                if (attempts < maxAttempts) {
                    const progress = Math.min(99, 80 + (attempts / maxAttempts) * 19);
                    setLipsyncProgress(progress);
                    console.log(`[Lipsync Poll] ⏳ Still processing... (${Math.round(progress)}%)`);
                    setTimeout(checkStatus, 3000);
                } else {
                    throw new Error('Video generation timed out');
                }

            } catch (e: any) {
                console.error('Polling error:', e);
                alert('Video generation failed: ' + e.message);
                setIsGeneratingLipsync(false);
                setLipsyncProgress(0);
            }
        };

        setTimeout(checkStatus, 3000);
    };

    const handleSendToWan21 = async () => {
        if (!selectedClip) return;

        const frameUrl = selectedClip.lastFrameUrl || selectedClip.url;
        const prompt = window.prompt('Enter prompt for Wan2.1 video generation:', selectedClip.metadata.enhancedPrompt || selectedClip.prompt || '');

        if (!prompt) return;

        try {
            // Extract filename from URL
            let imageFilename = '';
            try {
                const urlObj = new URL(frameUrl, window.location.origin);
                const params = new URLSearchParams(urlObj.search);
                imageFilename = params.get('filename') || '';
            } catch {
                imageFilename = frameUrl.split('/').pop() || '';
            }

            // Call Wan2.1 API
            const res = await fetch('/api/comfyui/wan21', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    imageFilename,
                    resolution: 512,
                    seed: Math.floor(Math.random() * 1000000)
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Wan2.1 video generation started! Prompt ID: ${data.promptId}\n\nCheck the Wan2.1 page to view results, then use "Add from URL" to add it to your workflow.`);
            } else {
                alert('Failed to start generation: ' + data.error);
            }
        } catch (err) {
            console.error('Wan2.1 error:', err);
            alert('Failed to generate video');
        }
    };

    const handleExtractFrame = async (clipIndex: number) => {
        setIsExtracting(true);
        try {
            const clip = session.clips[clipIndex];
            const res = await fetch('/api/video/extract-frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: clip.url })
            });

            const data = await res.json();
            if (data.success) {
                // Update clip with last frame URL
                const updatedClips = [...session.clips];
                updatedClips[clipIndex] = {
                    ...updatedClips[clipIndex],
                    lastFrameUrl: data.frameUrl
                };

                setSession({
                    ...session,
                    clips: updatedClips,
                    updatedAt: Date.now()
                });

                alert('Last frame extracted successfully!');
            } else {
                alert('Frame extraction failed: ' + data.error);
            }
        } catch (err) {
            console.error('Extract error:', err);
            alert('Failed to extract frame');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleCombineVideos = async () => {
        if (session.clips.length === 0) {
            alert('No clips to combine!');
            return;
        }

        if (!confirm(`Combine ${session.clips.length} clips into one video with crossfade transitions?`)) {
            return;
        }

        setIsCombining(true);
        setCombineProgress(0);

        try {
            const res = await fetch('/api/video/combine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clips: session.clips })
            });

            setCombineProgress(50);

            const data = await res.json();

            if (data.success) {
                setCombineProgress(100);
                alert(`Video combined successfully!\n\nDownload: ${window.location.origin}${data.videoUrl}`);

                // Open video in new tab
                window.open(data.videoUrl, '_blank');
            } else {
                alert('Failed to combine videos: ' + data.error);
            }
        } catch (err) {
            console.error('Combine error:', err);
            alert('Failed to combine videos');
        } finally {
            setIsCombining(false);
            setCombineProgress(0);
        }
    };

    const handleAutoTag = async () => {
        if (!selectedClip || selectedClip.type !== 'image') return;

        setIsTagging(true);
        try {
            // Convert image URL to base64
            const imageBase64 = await urlToBase64(selectedClip.url);

            const res = await fetch('/api/ollama/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    mode: 'tag'
                })
            });

            const data = await res.json();
            if (data.success) {
                // Update clip metadata
                const updatedClips = [...session.clips];
                updatedClips[selectedClipIndex!] = {
                    ...updatedClips[selectedClipIndex!],
                    metadata: {
                        ...updatedClips[selectedClipIndex!].metadata,
                        ollamaTags: data.tags,
                        ollamaDescription: data.description
                    }
                };

                setSession({
                    ...session,
                    clips: updatedClips,
                    updatedAt: Date.now()
                });

                alert(`Tags generated:\n${data.tags.join(', ')}`);
            } else {
                alert('Tagging failed: ' + data.error);
            }
        } catch (err) {
            console.error('Tagging error:', err);
            alert('Failed to tag image');
        } finally {
            setIsTagging(false);
        }
    };

    const handleEnhancePrompt = async () => {
        const userPrompt = window.prompt('Enter your prompt to enhance:', selectedClip?.prompt || '');
        if (!userPrompt) return;

        setIsEnhancing(true);
        setEnhancedPrompt('');

        try {
            // Build context from previous clips
            const context = session.clips
                .slice(0, selectedClipIndex || 0)
                .map(c => c.prompt || c.metadata.ollamaDescription)
                .filter(Boolean)
                .join(' → ');

            const res = await fetch('/api/ollama/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    context: context || undefined
                })
            });

            const data = await res.json();
            if (data.success) {
                setEnhancedPrompt(data.enhanced);

                // Update clip with enhanced prompt
                if (selectedClipIndex !== null) {
                    const updatedClips = [...session.clips];
                    updatedClips[selectedClipIndex] = {
                        ...updatedClips[selectedClipIndex],
                        metadata: {
                            ...updatedClips[selectedClipIndex].metadata,
                            originalPrompt: userPrompt,
                            enhancedPrompt: data.enhanced
                        }
                    };

                    setSession({
                        ...session,
                        clips: updatedClips,
                        updatedAt: Date.now()
                    });
                }
            } else {
                alert('Enhancement failed: ' + data.error);
            }
        } catch (err) {
            console.error('Enhancement error:', err);
            alert('Failed to enhance prompt');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleAddClipFromUrl = () => {
        const url = window.prompt('Enter video/image URL:');
        if (!url) return;

        const type = window.prompt('Type: image, lipsync, or wan21?', 'image') as 'image' | 'lipsync' | 'wan21';
        const prompt = window.prompt('Enter prompt (optional):', '');

        const newClip: WorkflowClip = {
            id: `clip_${Date.now()}`,
            type,
            url,
            prompt: prompt || undefined,
            timestamp: Date.now(),
            metadata: {}
        };

        setSession({
            ...session,
            clips: [...session.clips, newClip],
            updatedAt: Date.now()
        });
    };

    const handleRemoveClip = (index: number) => {
        if (!confirm('Remove this clip?')) return;

        const updatedClips = session.clips.filter((_, i) => i !== index);
        setSession({
            ...session,
            clips: updatedClips,
            updatedAt: Date.now()
        });

        if (selectedClipIndex === index) {
            setSelectedClipIndex(null);
        }
    };

    // Helper to convert URL to base64
    const urlToBase64 = async (url: string): Promise<string> => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: 'white'
            }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                        🎬 Workflow Chain Builder
                    </h1>
                    <input
                        type="text"
                        value={session.name}
                        onChange={(e) => setSession({ ...session, name: e.target.value })}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px',
                            width: '300px'
                        }}
                        placeholder="Project name..."
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleNewSession} style={buttonStyle}>
                        ✨ New
                    </button>
                    <button onClick={() => handleSaveSession(false)} style={buttonStyle}>
                        💾 Save
                    </button>
                    <button onClick={() => setShowSessions(!showSessions)} style={buttonStyle}>
                        📂 Load ({savedSessions.length})
                    </button>
                    <button onClick={handleAddClipFromUrl} style={{ ...buttonStyle, background: '#10b981' }}>
                        ➕ Add from URL
                    </button>
                    <button
                        onClick={handleCombineVideos}
                        disabled={session.clips.length === 0 || isCombining}
                        style={{
                            ...buttonStyle,
                            background: session.clips.length === 0 ? '#666' : '#f59e0b',
                            cursor: session.clips.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isCombining ? `⏳ Combining ${combineProgress}%...` : '🎞️ Finalize & Combine'}
                    </button>
                </div>
            </div>

            {/* Sessions Panel */}
            {showSessions && (
                <div style={{
                    marginBottom: '24px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                        📂 Saved Sessions
                    </h3>
                    {savedSessions.length === 0 ? (
                        <p style={{ color: '#666' }}>No saved sessions yet</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {savedSessions.map(s => (
                                <div key={s.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div>
                                        <strong>{s.name}</strong>
                                        <span style={{ marginLeft: '12px', color: '#888', fontSize: '13px' }}>
                                            {s.clips.length} clips · {new Date(s.updatedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleLoadSession(s.id)} style={smallButtonStyle}>
                                            📥 Load
                                        </button>
                                        <button onClick={() => handleDeleteSession(s.id)} style={{ ...smallButtonStyle, background: '#ef4444' }}>
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content - Timeline + Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '24px' }}>
                {/* Timeline Panel */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    maxHeight: '700px',
                    overflowY: 'auto'
                }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                        🎞️ Timeline ({session.clips.length} clips)
                    </h3>

                    {session.clips.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#666',
                            border: '2px dashed #333',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
                            <p>No clips yet</p>
                            <p style={{ fontSize: '12px', marginTop: '8px' }}>
                                Add clips from Image/Lipsync/Wan2.1 generators<br />or use "Add from URL"
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {session.clips.map((clip, idx) => (
                                <div
                                    key={clip.id}
                                    onClick={() => setSelectedClipIndex(idx)}
                                    style={{
                                        padding: '12px',
                                        background: selectedClipIndex === idx ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${selectedClipIndex === idx ? '#667eea' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', minWidth: '30px' }}>
                                            {clip.type === 'image' ? '🖼️' : clip.type === 'lipsync' ? '🎤' : '🎬'}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {idx + 1}. {clip.type.toUpperCase()}
                                            </div>
                                            {clip.prompt && (
                                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                                    "{clip.prompt.substring(0, 40)}..."
                                                </div>
                                            )}
                                            {clip.metadata.ollamaTags && (
                                                <div style={{ fontSize: '11px', color: '#ba55d3' }}>
                                                    🏷️ {clip.metadata.ollamaTags.slice(0, 3).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveClip(idx);
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview & Actions Panel */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px'
                }}>
                    {selectedClip ? (
                        <div>
                            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                                Clip {selectedClipIndex! + 1}: {selectedClip.type.toUpperCase()}
                            </h3>

                            {/* Preview */}
                            <div style={{
                                marginBottom: '20px',
                                background: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #333'
                            }}>
                                {selectedClip.type === 'image' ? (
                                    <img src={selectedClip.url} alt="Clip" style={{ width: '100%', display: 'block' }} />
                                ) : (
                                    <video src={selectedClip.url} controls style={{ width: '100%', display: 'block' }} />
                                )}
                            </div>

                            {/* Last Frame */}
                            {selectedClip.lastFrameUrl && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#999' }}>Last Frame:</h4>
                                    <img
                                        src={selectedClip.lastFrameUrl}
                                        alt="Last frame"
                                        style={{
                                            width: '200px',
                                            borderRadius: '8px',
                                            border: '1px solid #333'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>⚡ Actions</h4>

                                {selectedClip.type !== 'image' && !selectedClip.lastFrameUrl && (
                                    <button
                                        onClick={() => handleExtractFrame(selectedClipIndex!)}
                                        disabled={isExtracting}
                                        style={{ ...actionButtonStyle, background: '#10b981' }}
                                    >
                                        {isExtracting ? '⏳ Extracting...' : '📸 Extract Last Frame'}
                                    </button>
                                )}

                                <button
                                    onClick={handleSendToLipsync}
                                    style={{ ...actionButtonStyle, background: '#f59e0b' }}
                                >
                                    🎤 Send to Lipsync
                                </button>

                                <button
                                    onClick={handleSendToWan21}
                                    style={{ ...actionButtonStyle, background: '#8b5cf6' }}
                                >
                                    🎬 Send to Wan2.1
                                </button>
                            </div>

                            {/* Ollama Panel */}
                            {selectedClip.type === 'image' && (
                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(186, 85, 211, 0.1)',
                                    border: '1px solid rgba(186, 85, 211, 0.3)',
                                    borderRadius: '8px',
                                    marginBottom: '20px'
                                }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#ba55d3' }}>
                                        🤖 Ollama AI
                                    </h4>

                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <button
                                            onClick={handleAutoTag}
                                            disabled={isTagging}
                                            style={{ ...smallButtonStyle, flex: 1, background: '#ba55d3' }}
                                        >
                                            {isTagging ? '⏳...' : '🏷️ Auto-Tag'}
                                        </button>
                                        <button
                                            onClick={handleEnhancePrompt}
                                            disabled={isEnhancing}
                                            style={{ ...smallButtonStyle, flex: 1, background: '#ba55d3' }}
                                        >
                                            {isEnhancing ? '⏳...' : '✨ Enhance Prompt'}
                                        </button>
                                    </div>

                                    {selectedClip.metadata.ollamaTags && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong style={{ fontSize: '12px', color: '#ba55d3' }}>Tags:</strong>
                                            <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px' }}>
                                                {selectedClip.metadata.ollamaTags.join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {selectedClip.metadata.enhancedPrompt && (
                                        <div>
                                            <strong style={{ fontSize: '12px', color: '#ba55d3' }}>Enhanced:</strong>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#ccc',
                                                marginTop: '4px',
                                                padding: '8px',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '4px'
                                            }}>
                                                {selectedClip.metadata.enhancedPrompt}
                                            </div>
                                        </div>
                                    )}

                                    {enhancedPrompt && (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{
                                                padding: '12px',
                                                background: 'rgba(186, 85, 211, 0.2)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(186, 85, 211, 0.4)',
                                                fontSize: '13px',
                                                color: 'white'
                                            }}>
                                                {enhancedPrompt}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Metadata */}
                            <div style={{
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#888'
                            }}>
                                <div><strong>ID:</strong> {selectedClip.id}</div>
                                <div><strong>Type:</strong> {selectedClip.type}</div>
                                {selectedClip.prompt && <div><strong>Prompt:</strong> {selectedClip.prompt}</div>}
                                <div><strong>Added:</strong> {new Date(selectedClip.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '80px 20px',
                            textAlign: 'center',
                            color: '#666'
                        }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👆</div>
                            <p>Select a clip from the timeline to view and edit</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Lipsync Generation Modal */}
            {showLipsyncModal && (
                <div
                    onClick={() => !isGeneratingLipsync && setShowLipsyncModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1a1a1a',
                            padding: '32px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            maxWidth: '600px',
                            width: '90%'
                        }}
                    >
                        <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                            🎤 Generate Lipsync Video
                        </h3>

                        {selectedClip && (
                            <div style={{ marginBottom: '20px' }}>
                                <img
                                    src={selectedClip.lastFrameUrl || selectedClip.url}
                                    alt="Reference"
                                    style={{
                                        width: '200px',
                                        borderRadius: '8px',
                                        border: '1px solid #333'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                                TTS Provider
                            </label>
                            <select
                                value={ttsProvider}
                                onChange={(e) => {
                                    const newProvider = e.target.value as 'voxcpm' | 'gemini';
                                    setTtsProvider(newProvider);
                                    setSelectedVoice(newProvider === 'gemini' ? 'sultry' : 'charlotte');
                                }}
                                disabled={isGeneratingLipsync}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    cursor: isGeneratingLipsync ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <option value="gemini">✨ Gemini TTS (FREE, Customizable)</option>
                                <option value="voxcpm">🔓 VoxCPM (Local, Voice Cloning)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                                {ttsProvider === 'gemini' ? 'Voice Style' : 'Voice Clone'}
                            </label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                disabled={isGeneratingLipsync}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    cursor: isGeneratingLipsync ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {ttsProvider === 'gemini' ? (
                                    <>
                                        <option value="sultry">💋 Sultry & Seductive</option>
                                        <option value="playful">😊 Playful & Energetic</option>
                                        <option value="mysterious">🌙 Mysterious & Alluring</option>
                                        <option value="professional">💼 Professional & Confident</option>
                                        <option value="passionate">❤️ Passionate & Intense</option>
                                        <option value="sweet">🍭 Sweet & Friendly</option>
                                        <option value="confident">💪 Confident & Commanding</option>
                                        <option value="gentle">💜 Gentle & Ethereal</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="charlotte">Charlotte 👩</option>
                                        <option value="natasha">Natasha 👩</option>
                                        <option value="rachel">Rachel 👩</option>
                                        <option value="sarah">Sarah 👩</option>
                                        <option value="bella">Bella 👩 (ElevenLabs)</option>
                                        <option value="sophia">Sophia 👩 (ElevenLabs)</option>
                                        <option value="luna">Luna 👩 (ElevenLabs)</option>
                                        <option value="amber">Amber 👩 (ElevenLabs)</option>
                                        <option value="ruby">Ruby 👩 (ElevenLabs)</option>
                                        <option value="jade">Jade 👩 (ElevenLabs)</option>
                                        <option value="scarlett">Scarlett 👩 (ElevenLabs)</option>
                                        <option value="violet">Violet 👩 (ElevenLabs)</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                                Text to Speak
                            </label>
                            <textarea
                                value={lipsyncText}
                                onChange={(e) => setLipsyncText(e.target.value)}
                                placeholder="What should this character say?"
                                rows={6}
                                disabled={isGeneratingLipsync}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '8px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                                Resolution
                            </label>
                            <select
                                value={lipsyncResolution}
                                onChange={(e) => setLipsyncResolution(e.target.value)}
                                disabled={isGeneratingLipsync}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '8px',
                                    cursor: isGeneratingLipsync ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="256">256x256 (⚡ Fastest - Testing)</option>
                                <option value="512">512x512 (🚀 Fast - Recommended)</option>
                                <option value="768">768x768 (⭐ High Quality)</option>
                                <option value="1024">1024x1024 (💎 Ultra Quality - Slow)</option>
                            </select>
                        </div>

                        {isGeneratingLipsync && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: '#a78bfa', fontWeight: '600' }}>
                                        {lipsyncProgress < 50 ? '🎤 Generating Audio...' :
                                            lipsyncProgress < 80 ? '🎬 Creating Video...' :
                                                '✨ Finalizing...'}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                        {Math.round(lipsyncProgress)}%
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#222',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: '1px solid #333'
                                }}>
                                    <div style={{
                                        width: `${lipsyncProgress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                                        transition: 'width 0.3s ease',
                                        boxShadow: lipsyncProgress > 0 ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                                    }} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleGenerateLipsync}
                                disabled={isGeneratingLipsync || !lipsyncText.trim()}
                                style={{
                                    flex: 1,
                                    padding: '14px 24px',
                                    background: isGeneratingLipsync || !lipsyncText.trim() ? '#444' : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isGeneratingLipsync || !lipsyncText.trim() ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '15px',
                                    opacity: isGeneratingLipsync || !lipsyncText.trim() ? 0.6 : 1
                                }}
                            >
                                {isGeneratingLipsync ? '⏳ Generating...' : '🎬 Generate'}
                            </button>
                            <button
                                onClick={() => setShowLipsyncModal(false)}
                                disabled={isGeneratingLipsync}
                                style={{
                                    padding: '14px 24px',
                                    background: '#333',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isGeneratingLipsync ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '15px',
                                    opacity: isGeneratingLipsync ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#93c5fd'
            }}>
                <h4 style={{ marginBottom: '12px', fontWeight: '600' }}>💡 How to Use:</h4>
                <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                    <li>Generate images in the <strong>Text-to-Image</strong> tool and send them here</li>
                    <li>Select a clip and click <strong>"Send to Lipsync"</strong> to make it speak</li>
                    <li>From lipsync videos, extract the last frame and <strong>"Send to Wan2.1"</strong> to extend the scene</li>
                    <li>Loop back: Send Wan2.1 clips to Lipsync again for continuous storytelling</li>
                    <li>Use <strong>Ollama AI</strong> to auto-tag images and enhance prompts</li>
                    <li><strong>Save</strong> your project to continue later (auto-saves every 30s)</li>
                    <li>When done, click <strong>"Finalize & Combine"</strong> to merge everything with crossfades!</li>
                </ol>
            </div>
        </div>
    );
}

const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s'
};

const smallButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
};

const actionButtonStyle: React.CSSProperties = {
    padding: '12px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s'
};
