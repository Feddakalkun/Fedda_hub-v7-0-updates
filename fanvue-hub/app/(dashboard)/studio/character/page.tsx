'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CharacterStudio() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        // Identity
        name: '',
        handle: '',
        bio: '',
        fanvueProfileId: '',
        fanvueSecret: '',

        // Appearance
        age: 22,
        height: 'Average (168cm)',
        bodyType: 'Athletic & Toned',
        breastSize: 'Medium (C)',
        hairColor: 'Blonde',
        hairStyle: 'Long & Wavy',
        eyeColor: 'Blue',
        skinTone: 'Fair & Natural',
        clothingStyle: 'Trendy & Casual',

        // Personality
        personality: [] as string[],
        llmModel: 'mistral',
        systemInstruction: '',

        // Voice
        voiceProvider: 'gemini',
        voiceModel: 'Puck', // Gemini default

        // Generated
        avatarPrompt: '',
        generatedAvatarUrl: ''
    });

    const bodyTypes = ['Slim & Petite', 'Athletic & Toned', 'Curvy & Voluptuous', 'Tall & Model-esque', 'Average & Natural'];
    const hairColors = ['Blonde', 'Brunette', 'Black', 'Red', 'Pink', 'Silver', 'Ombre'];
    const eyeColors = ['Blue', 'Green', 'Brown', 'Hazel', 'Grey'];
    const personalities = ['Flirty', 'Intellectual', 'Playful', 'Dominant', 'Submissive', 'Funny', 'Caring', 'Mysterious'];

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const generateAppearancePrompt = () => {
        const prompt = `portrait of a ${formData.age} year old woman, ${formData.hairColor} ${formData.hairStyle} hair, ${formData.eyeColor} eyes, ${formData.bodyType} body, ${formData.breastSize} chest, ${formData.skinTone} skin, wearing ${formData.clothingStyle}, highly detailed, photorealistic, 8k`;
        setFormData(prev => ({ ...prev, avatarPrompt: prompt }));
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            // Save logic here (call API)
            // Ideally POST /api/characters/create

            // For now just mock it and redirect
            await new Promise(r => setTimeout(r, 1000));
            alert('Character Created! (Mock)');
            router.push('/characters');
        } catch (e) {
            alert('Error creating character');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '0.05em', marginBottom: '8px' }}>Character Studio</h1>
                <p style={{ color: '#666', fontSize: '14px' }}>Create your perfect AI persona step-by-step</p>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '60px', gap: '20px' }}>
                {['Identity', 'Appearance', 'Personality', 'Voice', 'Review'].map((label, idx) => {
                    const stepNum = idx + 1;
                    const isActive = step === stepNum;
                    const isCompleted = step > stepNum;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isActive || isCompleted ? 1 : 0.3 }}>
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: isActive ? '#fff' : (isCompleted ? '#4ade80' : '#333'),
                                color: isActive ? '#000' : (isCompleted ? '#000' : '#888'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: 'bold'
                            }}>
                                {isCompleted ? '✓' : stepNum}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                            {stepNum < 5 && <div style={{ width: '40px', height: '1px', background: '#333', marginLeft: '12px' }} />}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: '60px' }}>
                {/* Main Form Area */}
                <div style={{ flex: 2 }}>

                    {step === 1 && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>Basic Identity</h2>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Name</label>
                                    <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Eve" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Handle</label>
                                    <input style={inputStyle} value={formData.handle} onChange={e => setFormData({ ...formData, handle: e.target.value })} placeholder="@eve_ai" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Bio</label>
                                    <textarea style={inputStyle} rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Short backstory..." />
                                </div>

                                <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '20px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.1)', marginTop: '20px' }}>
                                    <h3 style={{ fontSize: '14px', color: '#38bdf8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fanvue Integration</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={labelStyle}>Profile ID</label>
                                            <input style={inputStyle} value={formData.fanvueProfileId} onChange={e => setFormData({ ...formData, fanvueProfileId: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Secret Token</label>
                                            <input style={inputStyle} type="password" value={formData.fanvueSecret} onChange={e => setFormData({ ...formData, fanvueSecret: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>Visual Appearance</h2>

                            <div style={{ display: 'grid', gap: '32px' }}>

                                {/* Age Slider */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <label style={labelStyle}>Age</label>
                                        <span style={{ color: '#fff' }}>{formData.age} years</span>
                                    </div>
                                    <input type="range" min="18" max="40" value={formData.age} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} style={{ width: '100%' }} />
                                </div>

                                {/* Body Type Selection */}
                                <div>
                                    <label style={labelStyle}>Body Type</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                        {bodyTypes.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFormData({ ...formData, bodyType: type })}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: formData.bodyType === type ? '#fff' : '#111',
                                                    color: formData.bodyType === type ? '#000' : '#888',
                                                    border: '1px solid #333',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hair & Eyes Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div>
                                        <label style={labelStyle}>Hair Color</label>
                                        <select style={inputStyle} value={formData.hairColor} onChange={e => setFormData({ ...formData, hairColor: e.target.value })}>
                                            {hairColors.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Eye Color</label>
                                        <select style={inputStyle} value={formData.eyeColor} onChange={e => setFormData({ ...formData, eyeColor: e.target.value })}>
                                            {eyeColors.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Generated Prompt Preview */}
                                <div style={{ padding: '20px', background: '#111', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label style={{ ...labelStyle, marginBottom: 0 }}>Generated Appearance Prompt</label>
                                        <button onClick={generateAppearancePrompt} style={{ fontSize: '11px', color: '#38bdf8', background: 'transparent', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>
                                            ↻ Regenerate
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5', fontStyle: 'italic' }}>
                                        {formData.avatarPrompt || "Click 'Regenerate' to create the prompt..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>Personality & Brain</h2>
                            {/* LLM & Tags Selection could go here */}
                            <p style={{ color: '#666' }}>Work in progress - Select LLM Model, tags, etc.</p>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>Voice</h2>
                            <p style={{ color: '#666' }}>Work in progress - Voice selection preview.</p>
                        </div>
                    )}

                    {step === 5 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>Review & Create</h2>
                            <p style={{ color: '#666' }}>Summary of all choices.</p>
                            <button onClick={handleCreate} style={{ padding: '12px 32px', background: '#fff', color: '#000', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>Create Character</button>
                        </div>
                    )}


                    {/* Navigation Buttons */}
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '24px' }}>
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            style={{ padding: '10px 24px', background: 'transparent', color: step === 1 ? '#333' : '#fff', border: '1px solid #333', borderRadius: '2px', cursor: step === 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Back
                        </button>

                        {step < 5 && (
                            <button
                                onClick={handleNext}
                                style={{ padding: '10px 32px', background: '#fff', color: '#000', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Next Step →
                            </button>
                        )}
                    </div>

                </div>

                {/* Live Preview Sidebar */}
                <div style={{ flex: 1, paddingTop: '60px' }}>
                    <div style={{ position: 'sticky', top: '40px' }}>
                        <h3 style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Character Preview</h3>
                        <div style={{ background: '#000', border: '1px solid #222', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '300px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '40px' }}>👤</div>
                                <span style={{ fontSize: '12px', color: '#444' }}>Avatar Preview</span>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{formData.name || 'Character Name'}</div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>{formData.handle || '@handle'}</div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[formData.bodyType, formData.hairColor].map(tag => (
                                        <span key={tag} style={{ fontSize: '10px', padding: '4px 8px', background: '#111', color: '#888', borderRadius: '2px' }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px'
};

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: '#000',
    border: '1px solid #333',
    color: '#fff',
    borderRadius: '2px',
    outline: 'none',
    fontSize: '14px'
};
