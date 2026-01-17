import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config-helper';

/**
 * GET /api/comfyui/models
 * 
 * Fetches available models from ComfyUI.
 * Used by the landing page to check if ComfyUI is ready.
 */
export async function GET() {
    try {
        const config = await getAppConfig();
        const comfyUrl = config.comfyuiUrl;

        // Fetch object_info from ComfyUI (contains model lists)
        const response = await fetch(`${comfyUrl}/object_info`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'ComfyUI not ready' },
                { status: 503 }
            );
        }

        const data = await response.json();

        // Extract model lists (checkpoints, loras, etc.)
        const models = {
            checkpoints: data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [],
            loras: data.LoraLoader?.input?.required?.lora_name?.[0] || [],
            vae: data.VAELoader?.input?.required?.vae_name?.[0] || [],
            ready: true
        };

        return NextResponse.json(models);

    } catch (error: any) {
        console.error('ComfyUI models fetch error:', error);
        return NextResponse.json(
            { error: 'ComfyUI unavailable', ready: false },
            { status: 503 }
        );
    }
}
