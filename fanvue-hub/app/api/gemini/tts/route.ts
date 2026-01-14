import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        console.log("[TTS] --- REQUEST START ---");
        const body = await request.json();
        const { text, voiceProvider = 'elevenlabs', voiceId, voiceModel } = body;

        if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

        // 1. Get Global Config (using raw query)
        let config: any = {};
        try {
            const configRaw = await (prisma as any).$queryRaw`SELECT * FROM AppConfig WHERE id = 'global' LIMIT 1`;
            config = (configRaw as any[])?.[0] || {};
        } catch (dbErr: any) {
            console.error("[TTS] DB Error:", dbErr.message);
        }

        // =========================================================================
        // ROUTE: ELEVENLABS (User's Suggestion)
        // =========================================================================
        if (voiceProvider === 'elevenlabs') {
            const apiKey = (config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY || '').trim();
            if (!apiKey) return NextResponse.json({ error: 'ElevenLabs key missing' }, { status: 400 });

            console.log('[ElevenLabs TTS] Calling with voice:', voiceId || 'EXAVITQu4emAZXAXiJ5b');

            // Detect language (Norwegian vs English)
            const norwegianWords = ['hei', 'deg', 'jeg', 'er', 'og', 'det', 'har', 'en', 'med', 'på', 'til', 'som', 'kan', 'vil', 'for', 'ikke', 'av', 'hun', 'han', 'min', 'din'];
            const isNorwegian = norwegianWords.some(word => text.toLowerCase().includes(` ${word} `) || text.toLowerCase().startsWith(word + ' '));

            const modelId = isNorwegian ? 'eleven_multilingual_v2' : 'eleven_monolingual_v1';
            console.log(`[ElevenLabs TTS] Language: ${isNorwegian ? 'Norwegian 🇳🇴' : 'English 🇺🇸'}, Model: ${modelId}`);

            try {
                const response = await axios.post(
                    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'EXAVITQu4emAZXAXiJ5b'}`,
                    {
                        text,
                        model_id: modelId,
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    },
                    {
                        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
                        responseType: 'arraybuffer',
                        timeout: 30000
                    }
                );

                return new NextResponse(response.data, {
                    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': response.data.byteLength.toString() }
                });
            } catch (err: any) {
                console.error('[ElevenLabs TTS] Error:', err.response?.data || err.message);
                return NextResponse.json({ error: 'ElevenLabs Failed', detail: err.message }, { status: 500 });
            }
        }

        // =========================================================================
        // ROUTE: UBERDUCK (Omni-V1 Hybrid)
        // =========================================================================
        const uberKey = (config.uberduckApiKey || process.env.UBERDUCK_API_KEY || '').trim();
        if (!uberKey) return NextResponse.json({ error: 'Uberduck key missing' }, { status: 400 });

        // Resolve voice identity (Slug or UUID)
        const targetVoice = voiceId || voiceModel || 'polly_salli';
        console.log(`[Uberduck TTS] Handshake | Voice: ${targetVoice} | Key: ${uberKey.substring(0, 4)}...`);

        try {
            // Attempt 1: Simple V1 Payload (The most common for modern keys)
            console.log("[Uberduck TTS] Attempting V1...");
            const response = await axios.post(
                'https://api.uberduck.ai/v1/text-to-speech',
                {
                    text: text,
                    voice: targetVoice
                },
                {
                    headers: { 'Authorization': `Bearer ${uberKey}`, 'Content-Type': 'application/json' },
                    timeout: 25000
                }
            );

            const audioUrl = response.data.url || response.data.audio_url || response.data.path;
            if (!audioUrl) throw new Error("No URL in response: " + JSON.stringify(response.data));

            console.log("[Uberduck TTS] Success! Final Audio URL:", audioUrl);

            const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            return new NextResponse(audioRes.data, {
                headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': audioRes.data.byteLength.toString() }
            });

        } catch (apiError: any) {
            const status = apiError.response?.status;
            const data = apiError.response?.data;
            console.error(`[Uberduck TTS] V1 API FAILURE (Status ${status}):`, data || apiError.message);

            // AUTO-FALLBACK: If the chosen voice fails, use a guaranteed stable slug
            if (status === 422 || status === 500 || status === 400) {
                console.log("[Uberduck TTS] Triggering Emergency Fallback ('miku')...");
                try {
                    const retry = await axios.post('https://api.uberduck.ai/v1/text-to-speech',
                        { text: text, voice: 'miku' },
                        { headers: { 'Authorization': `Bearer ${uberKey}` }, timeout: 15000 }
                    );
                    const retryUrl = retry.data.url || retry.data.audio_url;
                    const audioRes = await axios.get(retryUrl, { responseType: 'arraybuffer' });
                    return new NextResponse(audioRes.data, { headers: { 'Content-Type': 'audio/mpeg' } });
                } catch (retryErr) {
                    console.error("[Uberduck TTS] Fallback also failed");
                }
            }

            return NextResponse.json({
                error: `Uberduck API Rejected request (${status})`,
                detail: data || apiError.message
            }, { status: status || 500 });
        }

    } catch (globalError: any) {
        console.error('[TTS Global Failure]:', globalError.message);
        return NextResponse.json({ error: 'TTS Global Failure', details: globalError.message }, { status: 500 });
    }
}
