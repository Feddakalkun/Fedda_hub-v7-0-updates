import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { text, voiceInstruction, voiceName } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API key not found" }, { status: 400 });
        }

        console.log(`[Gemini TTS] Generating audio for: "${text.substring(0, 50)}..."`);
        console.log(`[Gemini TTS] Voice: ${voiceName || 'Puck (default)'}`);

        // Map voice instructions to suitable Gemini voices
        const voiceMap: Record<string, string> = {
            'sultry': 'Puck',      // Breathy, expressive
            'professional': 'Kore', // Clear, informative
            'playful': 'Charon',   // Upbeat, bright
            'mysterious': 'Aoede', // Soft, ethereal
            'passionate': 'Fenrir', // Intense, dramatic
            'sweet': 'Leda',       // Friendly, warm
            'confident': 'Kore',   // Strong, clear
            'gentle': 'Aoede',     // Soft, calming
        };

        const selectedVoice = voiceName || voiceMap[voiceInstruction || 'sultry'] || 'Puck';

        // Build the prompt with voice instruction if provided
        const prompt = voiceInstruction
            ? `${voiceInstruction}\n\nSpeak: "${text}"`
            : `Say: "${text}"`;

        // Make REST API call to Gemini TTS
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],  // CORRECT: Use responseModalities, not response_mime_type
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: selectedVoice
                                }
                            }
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Gemini TTS] API Error:', errorText);
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Extract audio data from response
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            console.error('[Gemini TTS] Response:', JSON.stringify(data, null, 2));
            throw new Error("No audio data returned from Gemini");
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');

        console.log(`[Gemini TTS] Audio generated: ${audioBuffer.length} bytes`);

        // Detect actual audio format from buffer header
        // WAV files start with "RIFF" (52 49 46 46)
        // MP3 files start with "ID3" or 0xFF 0xFB
        const header = audioBuffer.slice(0, 4).toString('ascii');
        const isWav = header === 'RIFF';
        const contentType = isWav ? 'audio/wav' : 'audio/mpeg';

        console.log(`[Gemini TTS] Audio format detected: ${contentType} (header: ${header})`);

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': audioBuffer.length.toString()
            }
        });

    } catch (error: any) {
        console.error("[Gemini TTS] Error:", error);
        return NextResponse.json({
            error: error.message || "Gemini TTS failed",
            details: error.toString()
        }, { status: 500 });
    }
}
