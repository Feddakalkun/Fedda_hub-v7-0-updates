import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = 'http://localhost:11435';

export async function POST(req: NextRequest) {
    try {
        const { image, prompt, model, mode } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        // image should be base64 string
        // Ollama expects pure base64 string in 'images' array
        const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

        // Determine prompt based on mode
        let actualPrompt = prompt;
        if (!actualPrompt) {
            if (mode === 'tag') {
                actualPrompt = 'Analyze this image and provide 5-10 relevant keywords/tags separated by commas. Focus on: subject, setting, mood, lighting, style. Return ONLY the tags, nothing else.';
            } else {
                actualPrompt = 'Describe this image in extreme detail, focusing on lighting, camera angle, composition, mood, and action.';
            }
        }

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'aha2025/llama-joycaption-beta-one-hf-llava:Q8_0',
                prompt: actualPrompt,
                images: [base64Image],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const data = await response.json();

        // If tag mode, parse tags from response
        if (mode === 'tag') {
            const tags = data.response
                .split(',')
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag.length > 0);

            return NextResponse.json({
                success: true,
                tags,
                description: data.response
            });
        }

        return NextResponse.json({ success: true, description: data.response });

    } catch (e: any) {
        console.error("Vision Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
