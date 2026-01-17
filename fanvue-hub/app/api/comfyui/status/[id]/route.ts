import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config-helper';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const config = await getAppConfig();
        const comfyUrl = config.comfyuiUrl;

        // Fetch from ComfyUI server-side (no CORS issues)
        const queueRes = await fetch(`${comfyUrl}/queue`);
        const queueData = await queueRes.json();

        // Check if running
        const running = queueData.queue_running || [];
        const isRunning = running.some((item: any) => item[1] === id);

        if (isRunning) {
            return NextResponse.json({
                status: 'running',
                message: 'Generating...',
                progress: 60
            });
        }

        // Check if completed in history
        const historyRes = await fetch(`${comfyUrl}/history/${id}`);
        const historyData = await historyRes.json();

        if (historyData[id]) {
            const outputs = historyData[id].outputs;

            // Extract image/video URLs from outputs
            const images: string[] = [];
            let videoUrl: string | null = null;

            console.log(`\n=== COMFYUI STATUS CHECK FOR ${id} ===`);
            console.log('Available nodes in outputs:', outputs ? Object.keys(outputs) : 'none');

            if (outputs) {
                const nodeIds = Object.keys(outputs);

                // IMPORTANT FIX: Iterate through nodes in REVERSE to get the LAST output node first
                // This ensures we get images from the final SaveImage node, not intermediate PreviewImage nodes
                for (let i = nodeIds.length - 1; i >= 0; i--) {
                    const nodeId = nodeIds[i];
                    const nodeOutput = outputs[nodeId];

                    // Images - only process if we haven't found any images yet
                    if (images.length === 0 && nodeOutput.images && Array.isArray(nodeOutput.images)) {
                        console.log(`Node ${nodeId} has ${nodeOutput.images.length} images:`);
                        nodeOutput.images.forEach((img: any) => {
                            console.log(`  - ${img.filename} (subfolder: ${img.subfolder || 'none'}, type: ${img.type || 'output'})`);
                            const filename = img.filename;
                            const subfolder = img.subfolder || '';
                            const type = img.type || 'output';
                            const imageUrl = `/api/comfyui/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
                            images.push(imageUrl);
                        });
                        console.log(`✓ Using images from node ${nodeId} (final output node)`);
                        // Don't break here - we want to continue checking for videos
                    }

                    // Videos (gifs/mp4s) - only process if we haven't found a video yet
                    if (!videoUrl) {
                        // Log the entire node output for debugging
                        console.log(`Node ${nodeId} output keys:`, Object.keys(nodeOutput));
                        console.log(`Node ${nodeId} full output:`, JSON.stringify(nodeOutput, null, 2));

                        // Check multiple possible keys: gifs, videos, video, filenames
                        const videoItems = nodeOutput.gifs || nodeOutput.videos || nodeOutput.video || nodeOutput.filenames;

                        if (videoItems && Array.isArray(videoItems)) {
                            console.log(`Node ${nodeId} has ${videoItems.length} video items:`, videoItems);
                            const vid = videoItems[0];
                            if (vid) {
                                // Handle both object format {filename, subfolder} and string format
                                const filename = typeof vid === 'string' ? vid : vid.filename;
                                const subfolder = typeof vid === 'object' ? (vid.subfolder || '') : '';
                                const type = typeof vid === 'object' ? (vid.type || 'output') : 'output';

                                console.log(`  - ${filename} (subfolder: ${subfolder || 'none'}, type: ${type})`);
                                videoUrl = `/api/comfyui/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
                                console.log(`✓ Using video from node ${nodeId}`);
                            }
                        }
                    }
                }
            }

            console.log(`Total images found: ${images.length}`);
            console.log(`Video URL from outputs: ${videoUrl || 'none'}`);

            // SPECIAL HANDLING FOR VHS_VideoCombine:
            // VHS nodes save to disk but don't always return the filename in outputs
            // Check the actual output folder for the most recent video file
            if (!videoUrl) {
                console.log('[VHS Fallback] Checking output folder for video files...');
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const outputDir = path.resolve('..', 'ComfyUI', 'output');

                    // Get the prompt submission time from history
                    const promptSubmitTime = historyData[id]?.prompt?.[3] || Date.now() - 60000; // Default to 1 min ago
                    console.log(`[VHS Fallback] Prompt submitted at: ${new Date(promptSubmitTime * 1000).toISOString()}`);

                    // Recursively find all video files
                    const findVideos = (dir: string): string[] => {
                        const files: string[] = [];
                        const items = fs.readdirSync(dir, { withFileTypes: true });
                        for (const item of items) {
                            const fullPath = path.join(dir, item.name);
                            if (item.isDirectory()) {
                                files.push(...findVideos(fullPath));
                            } else if (item.name.match(/\.(mp4|webm|avi|mov)$/i)) {
                                // Only include videos modified AFTER this prompt was submitted
                                const stats = fs.statSync(fullPath);
                                const videoTime = stats.mtime.getTime();
                                if (videoTime > promptSubmitTime * 1000) {
                                    files.push(fullPath);
                                }
                            }
                        }
                        return files;
                    };

                    const videoFiles = findVideos(outputDir);
                    console.log(`[VHS Fallback] Found ${videoFiles.length} videos created after prompt submission`);

                    if (videoFiles.length > 0) {
                        // Sort by modification time, get most recent
                        const sorted = videoFiles.map(f => ({
                            path: f,
                            mtime: fs.statSync(f).mtime.getTime()
                        })).sort((a, b) => b.mtime - a.mtime);

                        const mostRecent = sorted[0].path;
                        const relativePath = path.relative(outputDir, mostRecent);
                        const filename = path.basename(mostRecent);
                        const subfolder = path.dirname(relativePath).replace(/\\/g, '/');

                        console.log(`[VHS Fallback] Found video: ${filename} in ${subfolder}`);
                        videoUrl = `/api/comfyui/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
                    } else {
                        console.log('[VHS Fallback] No new videos found - workflow may have failed');
                    }
                } catch (err) {
                    console.error('[VHS Fallback] Error scanning output folder:', err);
                }
            }

            console.log(`Final Video URL: ${videoUrl || 'none'}`);
            console.log('====================================\n');

            return NextResponse.json({
                status: 'success', // Kept as 'success' to match frontend expectation
                message: 'Complete!',
                progress: 100,
                outputs: images, // Kept as 'outputs' to match frontend expectation of string array
                videoUrl,
                rawOutputs: outputs // Changed from 'outputs' to 'rawOutputs' to avoid conflict
            });
        }

        // Check if queued
        const pending = queueData.queue_pending || [];
        const queuePosition = pending.findIndex((item: any) => item[1] === id);

        if (queuePosition >= 0) {
            return NextResponse.json({
                status: 'queued',
                message: `Queued (${queuePosition + 1} ahead)...`,
                progress: 15
            });
        }

        // Still processing
        return NextResponse.json({
            status: 'running',
            message: 'Processing...',
            progress: 50
        });

    } catch (error: any) {
        console.error('ComfyUI status check error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Failed to check status',
            error: error.message
        }, { status: 500 });
    }
}
