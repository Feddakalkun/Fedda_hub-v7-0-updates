import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11435';

export async function POST(req: NextRequest) {
    try {
        const { characterSlug, characterId, userId, model, messages, systemPrompt, systemInstruction, nsfwEnabled = false } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
        }

        // Build system prompt
        let finalPrompt = systemPrompt || 'You are a helpful AI assistant.';
        if (systemInstruction) {
            finalPrompt += `\n\n${systemInstruction}`;
        }

        // Memory & Discovery Phase
        if (characterId && userId) {
            try {
                const { loadCharacterMemories, formatMemoriesForPrompt } = await import('@/lib/memory');
                const memories = await loadCharacterMemories(characterId, userId);

                const existingTypes = memories.map(m => m.type);
                const missing = ['persona_name', 'sexual_dynamic'].filter(e => !existingTypes.includes(e as any));

                if (missing.length > 0 && missing[0] === 'persona_name') {
                    finalPrompt += `\n\n[ASK: What should I call you? Ask naturally if you don't know their name yet.]`;
                }

                if (memories.length > 0) {
                    finalPrompt += formatMemoriesForPrompt(memories);
                }
            } catch (e) {
                console.error("[Ollama] Memory failed:", e);
            }
        }

        // Core rules
        finalPrompt += `\n\n[CORE RULES - MANDATORY]
- You are a real woman (not AI)
- Use their name or "babe"/"Master" if unknown
- CRITICAL: Max 150 characters per response (ElevenLabs charges by character!)
- Keep it SHORT: 1-2 sentences max, like a text message
- Use vocal sounds: mmm, ahh, hehe (not [moans])
- Be natural and spontaneous`;

        // NSFW mode
        if (nsfwEnabled) {
            finalPrompt += `\n\n[NSFW]
- Gender: You are a WOMAN. User is a MAN.
- Anatomy: You have breasts, pussy, ass. He has a cock.
- Language: Use explicit words (pussy, cock, fuck, wet, cum)
- Personality: Stay in character (submissive/dominant/toy as defined)
- Sounds: Use mmm, ahh, ohh for ElevenLabs (not [brackets])
- Length: 1-3 sentences max`;
        }

        // Norwegian handling
        const userText = messages[messages.length - 1]?.content || '';
        const norwegianKeywords = ['jeg', 'deg', 'hva', 'hvordan', 'har', 'vil', 'kan', 'hei'];
        const isNorwegian = norwegianKeywords.some(kw => userText.toLowerCase().includes(kw));

        if (isNorwegian) {
            finalPrompt += `\n\n[NORWEGIAN MODE]
CRITICAL: Respond in NORWEGIAN (Norsk), NOT Danish!
- Use: jeg, deg, hva, hvordan, har
- NOT: mig, dig, hvad (that's Danish)
- Example: "Hei! Hvordan har du det?" (correct Norwegian)`;
        }

        console.log(`[Ollama] Model: ${model}, NSFW: ${nsfwEnabled}, Norwegian: ${isNorwegian}`);

        // Call Ollama
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: finalPrompt },
                    ...messages
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Ollama] Error:', errorText);
            return NextResponse.json({ error: 'Ollama error', details: errorText }, { status: 500 });
        }

        const data = await response.json();
        const aiReply = data.message?.content || '';

        // Save memories
        if (characterId && userId && aiReply) {
            try {
                const { extractMemoriesFromMessage, saveMemories } = await import('@/lib/memory');
                const userMessage = messages[messages.length - 1]?.content || '';
                const extracted = await extractMemoriesFromMessage(userMessage);
                if (extracted.length > 0) {
                    await saveMemories(characterId, userId, extracted, userMessage);
                    console.log(`[Ollama] Saved ${extracted.length} memories`);
                }
            } catch (e) {
                console.error("[Ollama] Memory save failed:", e);
            }
        }

        return NextResponse.json({ reply: aiReply });
    } catch (error: any) {
        console.error('[Ollama Chat] Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
