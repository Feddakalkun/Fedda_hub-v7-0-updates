import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get API config from database or return defaults
        const config = await prisma.appConfig.findUnique({
            where: { id: 'global' },
            select: {
                geminiApiKey: true,
                comfyuiUrl: true,
                voxcpmUrl: true,
                ollamaUrl: true,
            }
        });

        return NextResponse.json({
            geminiApiKey: config?.geminiApiKey || process.env.GEMINI_API_KEY || '',
            comfyuiUrl: config?.comfyuiUrl || process.env.COMFYUI_URL || 'http://localhost:8188',
            voxcpmUrl: config?.voxcpmUrl || process.env.VOXCPM_URL || 'http://localhost:7860',
            ollamaUrl: config?.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11435',
        });
    } catch (error) {
        console.error('[API Settings] Error loading:', error);
        return NextResponse.json({
            geminiApiKey: process.env.GEMINI_API_KEY || '',
            comfyuiUrl: process.env.COMFYUI_URL || 'http://localhost:8188',
            voxcpmUrl: process.env.VOXCPM_URL || 'http://localhost:7860',
            ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11435',
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { geminiApiKey, comfyuiUrl, voxcpmUrl, ollamaUrl } = await req.json();

        // Upsert to database
        await prisma.appConfig.upsert({
            where: { id: 'global' },
            update: {
                geminiApiKey,
                comfyuiUrl,
                voxcpmUrl,
                ollamaUrl,
                updatedAt: new Date(),
            },
            create: {
                id: 'global',
                geminiApiKey,
                comfyuiUrl,
                voxcpmUrl,
                ollamaUrl,
            }
        });

        console.log('[API Settings] Saved successfully');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API Settings] Error saving:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
