import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config-helper';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const filename = searchParams.get('filename');
        const subfolder = searchParams.get('subfolder') || '';
        const type = searchParams.get('type') || 'output';

        if (!filename) {
            return new NextResponse('Filename is required', { status: 400 });
        }

        const config = await getAppConfig();
        const comfyUrl = config.comfyuiUrl;

        // Fetch image from ComfyUI
        const imageUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;

        const response = await fetch(imageUrl);

        if (!response.ok) {
            return new NextResponse('Failed to fetch image from ComfyUI', { status: response.status });
        }

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        // Determine content type
        const ext = filename.split('.').pop()?.toLowerCase();
        let contentType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'mp4') contentType = 'video/mp4';

        return new NextResponse(Buffer.from(buffer), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error: any) {
        console.error('Image proxy error:', error);
        return new NextResponse(error.message, { status: 500 });
    }
}
