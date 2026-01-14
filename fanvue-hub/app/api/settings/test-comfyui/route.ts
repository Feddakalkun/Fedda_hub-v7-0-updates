import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { comfyuiUrl } = await req.json();

        if (!comfyuiUrl) {
            return NextResponse.json({ success: false, error: 'No URL provided' });
        }

        // Test ComfyUI by pinging /system_stats
        const response = await fetch(`${comfyuiUrl}/system_stats`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `ComfyUI not responding (${response.status})`
            });
        }

        const data = await response.json();
        const vramUsed = data.devices?.[0]?.vram_used || 'unknown';

        return NextResponse.json({
            success: true,
            message: `Connected! VRAM in use: ${vramUsed}`
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Cannot reach ComfyUI server'
        });
    }
}
