import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { geminiApiKey } = await req.json();

        if (!geminiApiKey) {
            return NextResponse.json({ success: false, error: 'No API key provided' });
        }

        // Test Gemini API with a simple request
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                success: false,
                error: `API test failed (${response.status}): ${errorText.substring(0, 100)}`
            });
        }

        const data = await response.json();
        const modelCount = data.models?.length || 0;

        return NextResponse.json({
            success: true,
            message: `Connected! ${modelCount} models available`
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Connection failed'
        });
    }
}
