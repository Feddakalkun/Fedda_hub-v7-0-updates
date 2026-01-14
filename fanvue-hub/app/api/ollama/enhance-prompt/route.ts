import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = 'http://localhost:11435';

export async function POST(req: NextRequest) {
    try {
        const { prompt, context, model } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
        }

        // Build enhancement instruction
        const systemPrompt = `You are an expert prompt engineer for AI image and video generation. Your task is to take a user's simple prompt and enhance it with rich, detailed descriptions that will produce better results.

Guidelines:
- Add specific details about lighting, camera angles, composition
- Include texture and material descriptions
- Specify mood and atmosphere
- Keep the core intent of the original prompt
- Make it cinematic and visually compelling
- Keep it under 200 words

${context ? `Previous context: ${context}` : ''}`;

        const enhancementRequest = `Original prompt: "${prompt}"

Please enhance this prompt to be more detailed and effective for AI generation. Return ONLY the enhanced prompt, nothing else.`;

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'mistral-openorca:latest',
                prompt: `${systemPrompt}\n\n${enhancementRequest}`,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const data = await response.json();
        const enhancedPrompt = data.response.trim();

        return NextResponse.json({
            success: true,
            original: prompt,
            enhanced: enhancedPrompt
        });

    } catch (e: any) {
        console.error("Prompt Enhancement Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
