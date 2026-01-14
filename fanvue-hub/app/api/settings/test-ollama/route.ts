import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { ollamaUrl } = await req.json();

        if (!ollamaUrl) {
            return NextResponse.json({ success: false, error: 'No URL provided' });
        }

        // Test Ollama by listing models
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `Ollama not responding (${response.status})`
            });
        }

        const data = await response.json();
        const modelCount = data.models?.length || 0;

        return NextResponse.json({
            success: true,
            message: `Connected! ${modelCount} models installed`
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Cannot reach Ollama server'
        });
    }
}
