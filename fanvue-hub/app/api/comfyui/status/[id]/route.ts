import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config-helper';
import { ComfyUIClient } from '@/lib/generators/comfyui-client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const config = await getAppConfig();
        const comfyClient = new ComfyUIClient();
        comfyClient.setBaseUrl(config.comfyuiUrl);

        // Check history (completed jobs)
        // ComfyUI history format: { "prompt_id": { "outputs": { ... }, "status": ... } }
        const history = await comfyClient.getPromptStatus(id);

        if (history && history[id]) {
            const outputs = history[id].outputs;
            // Find the image output
            let images: string[] = [];

            for (const nodeId in outputs) {
                if (outputs[nodeId].images) {
                    outputs[nodeId].images.forEach((img: any) => {
                        // Construct local URL for the image
                        images.push(`/api/comfyui/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`);
                    });
                }
                // Handle video/gifs if any
                if (outputs[nodeId].gifs) {
                    outputs[nodeId].gifs.forEach((gif: any) => {
                        images.push(`/api/comfyui/view?filename=${gif.filename}&subfolder=${gif.subfolder}&type=${gif.type}`);
                    });
                }
            }

            return NextResponse.json({
                status: 'success',
                outputs: images,
                raw: history[id]
            });
        }

        // Check queue (pending/running jobs)
        const queue = await comfyClient.getQueue();

        const isRunning = queue.queue_running.some((item: any) => item[1] === id);
        const isPending = queue.queue_pending.some((item: any) => item[1] === id);

        if (isRunning || isPending) {
            return NextResponse.json({
                status: 'generating',
                progress: isRunning ? 50 : 10 // Arbitrary progress
            });
        }

        // If not in history and not in queue, it might have failed or invalid ID
        return NextResponse.json({
            status: 'error',
            message: 'Job not found or failed'
        });

    } catch (error: any) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
