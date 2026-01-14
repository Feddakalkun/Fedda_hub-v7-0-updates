'use client';

import { useState, useRef, useEffect } from 'react';

interface Character {
    id: string;
    name: string;
    slug: string;
    avatarUrl?: string;
    bio?: string;
    voiceProvider?: string;
    voiceModel?: string;
    voiceId?: string;
    voiceDescription?: string;
    llmModel?: string;
}

interface PhoneCallProps {
    character: Character;
    onHangup: () => void;
}

export default function PhoneCall({ character, onHangup }: PhoneCallProps) {
    const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'speaking' | 'listening'>('calling');
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true); // Default to speaker on
    const [language, setLanguage] = useState<'en-US' | 'nb-NO'>('en-US'); // Default to English
    const [error, setError] = useState<string | null>(null);

    // ✅ CRITICAL FIX: Use ref instead of state to avoid stale closures
    const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [transcripts, setTranscripts] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [showTranscripts, setShowTranscripts] = useState(false);

    // Sync ref to transcripts for UI
    const addMessageToHistory = (role: 'user' | 'assistant', content: string) => {
        const newMsg = { role, content };
        conversationHistoryRef.current = [...conversationHistoryRef.current, newMsg];
        setTranscripts(prev => [...prev, newMsg]);
    };

    // Audio handling
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const recognitionRef = useRef<any>(null);

    // Debug Log
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-4), msg]);

    // Initial Connection
    useEffect(() => {
        const timer = setTimeout(() => {
            setCallStatus('connected');

            // Simple, open greeting - let the user drive the dynamic
            const greeting = `Hey... mmm... it's ${character.name}. What do you want?`;
            handleAIResponse(greeting);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Call Duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus !== 'calling') {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language; // Use selected language

            console.log(`[PhoneCall] 🎤 Speech Recognition Language: ${language}`);

            recognition.onstart = () => {
                addLog("Mic: Active");
                if (callStatus === 'connected') setCallStatus('listening');
            };

            recognition.onend = () => {
                addLog("Mic: Stopped");
                // ✅ ALWAYS auto-restart unless muted (keep mic active continuously)
                if (!isMuted) {
                    setTimeout(() => {
                        try {
                            recognition.start();
                            addLog("Mic: Restarted");
                        } catch { }
                    }, 100); // Small delay to prevent rapid restart errors
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') return;
                addLog(`Mic Err: ${event.error}`);
                if (event.error === 'not-allowed') {
                    setError("Microphone access denied");
                }
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript && finalTranscript.trim().length > 1) {
                    // Check Interruption
                    if (callStatus === 'speaking') {
                        addLog("[Interrupt]");
                        if (currentAudioRef.current) {
                            currentAudioRef.current.pause();
                            currentAudioRef.current = null;
                        }
                    }

                    addLog(`Heard: ${finalTranscript}`);
                    // Process input
                    handleAIResponse(finalTranscript, true);
                } else if (finalTranscript) {
                    addLog(`Ignored (Too short): ${finalTranscript}`);
                }
            };

            recognitionRef.current = recognition;
        } else {
            setError("Voice input not supported");
        }
    }, [isMuted, language]); // Re-bind if mute or language changes

    // Manage Mic State based on Call Status
    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (callStatus === 'listening' || callStatus === 'connected' || callStatus === 'speaking') {
            if (!isMuted) {
                try {
                    recognition.start();
                    console.log('[PhoneCall] 🎤 Starting recognition, status:', callStatus);
                    addLog("Mic: Starting");
                } catch (e: any) {
                    // Already running is OK
                    if (!e.message?.includes('already started')) {
                        console.error('[PhoneCall] Mic start failed:', e);
                    }
                }
            }
        }
    }, [callStatus, isMuted]);


    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAIResponse = async (inputText: string, isUserMessage = false) => {
        if (!inputText.trim()) return;

        // 🛑 STOP recognition to prevent feedback loop (mic hearing her voice)
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                addLog("Mic: Paused (speaking)");
            } catch { }
        }

        // Stop listening while processing/speaking
        setCallStatus('speaking');

        let responseText = inputText;

        try {
            if (isUserMessage) {
                // MEMORY EXTRACTION (Phase 1) - Now with proper error handling
                try {
                    console.log('[PhoneCall] Extracting memory from:', inputText);
                    const memRes = await fetch('/api/memory/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: inputText,
                            characterId: character.id,
                            userId: 'user-local'
                        })
                    });

                    const memData = await memRes.json();
                    if (memData.success) {
                        console.log(`[PhoneCall] ✅ Saved ${memData.count} memories`);
                        addLog(`Mem: Saved ${memData.count}`);
                    } else {
                        console.warn('[PhoneCall] ❌ Memory extraction failed:', memData.error);
                        addLog('Mem: Failed');
                    }
                } catch (e: any) {
                    console.error("[PhoneCall] Memory Trigger Failed:", e);
                    addLog('Mem: Error');
                }

                // 🎨 COMMAND DETECTION (Check for image/video requests)
                const { parseCommand } = await import('@/lib/command-parser');
                const command = parseCommand(inputText);

                if (command.type === 'image') {
                    addLog('Cmd: Image Gen');
                    console.log('[PhoneCall] 📸 Image request detected:', command.prompt);

                    // Build Flux-optimized prompt
                    try {
                        const fluxRes = await fetch('/api/flux/prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                characterSlug: character.slug,
                                userPrompt: command.prompt
                            })
                        });

                        const fluxData = await fluxRes.json();

                        if (fluxData.success) {
                            console.log('[PhoneCall] 🎨 Flux Prompt Built:', fluxData.prompt.substring(0, 100));

                            // Trigger Z-Image workflow
                            const imgRes = await fetch('/api/comfyui/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    characterSlug: character.slug,
                                    prompt: fluxData.prompt,
                                    negativePrompt: fluxData.negativePrompt,
                                    numImages: 1,
                                    workflow: 'z-image' // Use your existing Z-Image workflow
                                })
                            });

                            const imgData = await imgRes.json();
                            if (imgData.success) {
                                responseText = `Mmm... hehe... taking that photo for you right now, babe. Give me like... 15 seconds.`;
                                addLog('Img: Z-Image Queued');
                            } else {
                                responseText = "Ahh... my camera's being weird. Let me try again in a sec... hehe.";
                            }
                        }
                    } catch (imgErr) {
                        console.error('[PhoneCall] Image gen failed:', imgErr);
                        responseText = "I tried to send you something sexy but my camera froze... mmm... we can keep talking though.";
                    }

                    // Skip normal AI response
                    setCallStatus('listening');

                    // Speak the acknowledgment
                    const spokenText = responseText.replace(/\*[^*]+\*/g, '').trim();
                    if (spokenText.length > 0) {
                        const ttsRes = await fetch('/api/gemini/tts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                text: spokenText,
                                voiceProvider: character.voiceProvider,
                                voiceModel: character.voiceModel,
                                voiceId: character.voiceId,
                                voiceDescription: character.voiceDescription
                            })
                        });

                        if (ttsRes.ok) {
                            const audioBlob = await ttsRes.blob();
                            const audioUrl = URL.createObjectURL(audioBlob);
                            const audio = new Audio(audioUrl);
                            audio.onended = () => setCallStatus('listening');
                            await audio.play();
                        }
                    }

                    return; // Exit early, no normal AI response needed
                }

                const aiModel = character.llmModel || 'mistral';
                addLog(`AI: Thinking (${aiModel})...`);

                const messagesToSend = [
                    ...conversationHistoryRef.current,
                    { role: 'user' as const, content: inputText }
                ];

                console.log(`[PhoneCall] 💬 Sending ${messagesToSend.length} messages to AI (including ${conversationHistoryRef.current.length} history)`);
                addLog(`Hist: ${conversationHistoryRef.current.length} msgs`);

                const languageInstruction = language === 'nb-NO'
                    ? '\n\n[LANGUAGE: NORWEGIAN]\nYou MUST respond in Norwegian (Norsk). The user is speaking Norwegian to you.'
                    : '';

                const chatRes = await fetch('/api/ollama/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterSlug: character.slug,
                        characterId: character.id,
                        userId: 'user-local',
                        model: aiModel,
                        messages: messagesToSend,  // ✅ Send full history
                        systemPrompt: character.bio,
                        systemInstruction: (character.bio || '') + languageInstruction,  // ✅ Add language instruction
                        nsfwEnabled: true
                    })
                });

                const chatData = await chatRes.json();
                if (chatData.reply) {
                    responseText = chatData.reply;

                    // ✅ SAVE to history
                    console.log('[PhoneCall] 💾 Saving to history: user + assistant');
                    addMessageToHistory('user', inputText);
                    addMessageToHistory('assistant', responseText);
                    console.log('[PhoneCall] 💾 New history length:', conversationHistoryRef.current.length);
                } else {
                    console.warn("Chat failed:", chatData.error || 'Unknown error');
                    responseText = "I'm having trouble connecting to my brain right now.";
                    addLog(`Error: ${chatData.error || 'AI Failed'}`);
                }
            } else {
                // Not a user message (e.g., initial greeting) - still save to history
                addMessageToHistory('assistant', responseText);
                console.log('[PhoneCall] 💾 Saved greeting to history, length:', conversationHistoryRef.current.length);
            }

            // Text to Speech
            addLog("AI: Generating Voice...");

            // Remove *actions* for TTS
            const spokenText = responseText.replace(/\*[^*]+\*/g, '').trim();

            if (spokenText.length > 0) {
                const ttsRes = await fetch('/api/gemini/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: spokenText,
                        voiceProvider: character.voiceProvider,
                        voiceModel: character.voiceModel,
                        voiceId: character.voiceId,
                        voiceDescription: character.voiceDescription
                    })
                });

                if (!ttsRes.ok) throw new Error('TTS Failed');

                const audioBlob = await ttsRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                if (currentAudioRef.current) currentAudioRef.current.pause();

                const audio = new Audio(audioUrl);
                currentAudioRef.current = audio;

                audio.onended = () => {
                    addLog("AI: Finished (Wait 1s)");
                    // Wait 1s to avoid echo loop, then restart mic
                    setTimeout(() => {
                        setCallStatus('listening');
                        // ✅ Explicitly restart recognition after she finishes
                        if (recognitionRef.current && !isMuted) {
                            try {
                                recognitionRef.current.start();
                                addLog("Mic: Resumed");
                            } catch { }
                        }
                    }, 1000);
                };

                await audio.play();
            } else {
                // If only actions (e.g. *smiles*), just finish immediately
                addLog("AI: (Action only)");
                setCallStatus('listening');
            }

        } catch (error: any) {
            addLog(`Err: ${error.message}`);
            // 🎙️ Browser Fallback (Improved)
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(responseText);

                // Try to find a better voice (female)
                const voices = window.speechSynthesis.getVoices();
                const femaleNames = ['female', 'zira', 'amy', 'jenny', 'aria', 'sara', 'michelle', 'google us english'];
                const femaleVoice = voices.find(v =>
                    femaleNames.some(name => v.name.toLowerCase().includes(name)) &&
                    v.lang.startsWith('en')
                );

                if (femaleVoice) utterance.voice = femaleVoice;

                utterance.onend = () => {
                    setTimeout(() => {
                        setCallStatus('listening');
                        if (recognitionRef.current && !isMuted) {
                            try { recognitionRef.current.start(); } catch { }
                        }
                    }, 1000);
                };
                window.speechSynthesis.speak(utterance);
            } else {
                setCallStatus('listening');
            }
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #202020 0%, #101010 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Debug Overlay */}
            <div style={{ position: 'absolute', top: 10, left: 10, width: '200px', fontSize: '10px', color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '8px', zIndex: 10, borderRadius: '4px', pointerEvents: 'none' }}>
                <div>Status: {callStatus}</div>
                {debugLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            {/* Transcript Side Panel (Sliding) */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: showTranscripts ? 0 : '-300px',
                width: '300px',
                height: '100%',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(20px)',
                zIndex: 100,
                transition: 'right 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Log</h3>
                    <button onClick={() => setShowTranscripts(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {transcripts.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '90%',
                            background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            lineHeight: '1.4',
                            color: msg.role === 'user' ? '#eee' : '#fff'
                        }}>
                            <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}>{msg.role === 'user' ? 'You' : character.name}</div>
                            {msg.content}
                        </div>
                    ))}
                    <div id="transcript-end" />
                </div>
            </div>

            {/* Background Blur */}
            {character.avatarUrl && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `url(${character.avatarUrl})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(30px) brightness(0.3)', zIndex: 0
                }} />
            )}

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, padding: '40px 20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Header info */}
                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>{character.name}</h2>
                    <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
                        {error ? <span style={{ color: '#EF4444' }}>{error}</span> : (callStatus === 'calling' ? 'calling...' : formatTime(duration))}
                    </div>
                </div>

                {/* Avatar */}
                <div style={{ marginTop: '60px', marginBottom: 'auto' }}>
                    <div style={{
                        width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden',
                        border: '4px solid rgba(255,255,255,0.1)',
                        boxShadow: callStatus === 'speaking' ? '0 0 0 20px rgba(255,255,255,0.05)' : 'none',
                        transition: 'box-shadow 0.3s ease'
                    }}>
                        {character.avatarUrl ? (
                            <img src={character.avatarUrl} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' }}>{character.name.charAt(0)}</div>
                        )}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '30px', color: 'rgba(255,255,255,0.5)', height: '24px' }}>
                        {callStatus === 'speaking' && "Speaking..."}
                        {callStatus === 'listening' && "Listening..."}
                    </div>
                </div>

                {/* Controls */}
                <div style={{ width: '100%', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '60px' }}>
                        {/* Mute Toggle */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: isMuted ? 'white' : 'rgba(255,255,255,0.1)',
                                border: 'none', color: isMuted ? 'black' : 'white',
                                fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {isMuted ? '🔇' : '🎙️'}
                        </button>

                        {/* Speaker Toggle */}
                        <button
                            onClick={() => setIsSpeaker(!isSpeaker)}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: isSpeaker ? 'white' : 'rgba(255,255,255,0.1)',
                                border: 'none', color: isSpeaker ? 'black' : 'white',
                                fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {isSpeaker ? '🔊' : '🔈'}
                        </button>

                        <button
                            onClick={() => {
                                // Manual re-trigger
                                if (recognitionRef.current) {
                                    try { recognitionRef.current.stop(); } catch { }
                                    try { recognitionRef.current.start(); } catch { }
                                }
                            }}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none', color: 'white',
                                fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            👂
                        </button>

                        {/* Language Toggle */}
                        <button
                            onClick={() => {
                                const newLang = language === 'en-US' ? 'nb-NO' : 'en-US';
                                setLanguage(newLang);
                                addLog(`Lang: ${newLang === 'nb-NO' ? 'Norwegian' : 'English'}`);
                                // useEffect will handle recreation automatically
                            }}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: language === 'nb-NO' ? 'white' : 'rgba(255,255,255,0.1)',
                                border: 'none', color: language === 'nb-NO' ? 'black' : 'white',
                                fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {language === 'nb-NO' ? '🇳🇴' : '🇺🇸'}
                        </button>

                        {/* Transcript Toggle */}
                        <button
                            onClick={() => setShowTranscripts(!showTranscripts)}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: showTranscripts ? 'white' : 'rgba(255,255,255,0.1)',
                                border: 'none', color: showTranscripts ? 'black' : 'white',
                                fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            💬
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={onHangup}
                            style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                background: '#EF4444', border: 'none', color: 'white',
                                fontSize: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                            }}
                        >
                            📞
                        </button>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={async () => {
                                if (!confirm(`Reset all memories for ${character.name}?`)) return;
                                await fetch('/api/memory/clear', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ characterId: character.id, userId: 'user-local' })
                                });
                                alert("Memory wiped. She won't remember you.");
                            }}
                            style={{
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                                color: 'rgba(255,255,255,0.5)', borderRadius: '20px',
                                padding: '8px 16px', fontSize: '12px', cursor: 'pointer'
                            }}
                        >
                            Reset Memory
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
