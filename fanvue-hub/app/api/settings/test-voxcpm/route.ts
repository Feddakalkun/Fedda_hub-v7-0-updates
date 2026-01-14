import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { voxcpmUrl } = await req.json();

        if (!voxcpmUrl) {
            return NextResponse.json({ success: false, error: 'No URL provided' });
        }

        // Test VoxCPM by checking if Gradio is running
        const response = await fetch(`${voxcpmUrl}/`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: `VoxCPM not responding (${response.status})`
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Connected! VoxCPM is running'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Cannot reach VoxCPM server'
        });
    }
}
