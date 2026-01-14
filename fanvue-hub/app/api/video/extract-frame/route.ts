import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Extract the last frame from a video file using FFmpeg
 */
export async function POST(request: NextRequest) {
    try {
        const { videoUrl } = await request.json();

        if (!videoUrl) {
            return NextResponse.json({
                success: false,
                error: 'Video URL is required',
            }, { status: 400 });
        }

        // Parse the video filename from URL
        let videoFileName = '';
        try {
            const urlObj = new URL(videoUrl, 'http://localhost');
            const params = new URLSearchParams(urlObj.search);
            if (params.has('filename')) {
                videoFileName = params.get('filename')!;
            } else {
                videoFileName = path.basename(urlObj.pathname);
            }
        } catch {
            videoFileName = path.basename(videoUrl);
        }

        // Construct paths
        const comfyBasePath = path.resolve(process.cwd(), '../ComfyUI');
        const outputDir = path.join(comfyBasePath, 'output');

        // Try to find the video file
        let videoPath = '';
        const possiblePaths = [
            path.join(outputDir, videoFileName),
            path.join(outputDir, 'lipsync', videoFileName),
            path.join(outputDir, 'wan21', videoFileName),
            path.join(outputDir, 'workflow-videos', videoFileName),
        ];

        for (const tryPath of possiblePaths) {
            if (fs.existsSync(tryPath)) {
                videoPath = tryPath;
                break;
            }
        }

        if (!videoPath || !fs.existsSync(videoPath)) {
            return NextResponse.json({
                success: false,
                error: `Video file not found: ${videoFileName}`,
            }, { status: 404 });
        }

        // Create frames output directory
        const framesDir = path.join(outputDir, 'frames');
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }

        // Generate unique filename for the frame
        const frameFileName = `frame_${Date.now()}_${path.basename(videoFileName, path.extname(videoFileName))}.png`;
        const frameOutputPath = path.join(framesDir, frameFileName);

        console.log(`[Frame Extraction] Extracting last frame from: ${videoPath}`);
        console.log(`[Frame Extraction] Output: ${frameOutputPath}`);

        // Use FFmpeg to extract the last frame
        // -sseof -1: seek to 1 second before end (to avoid black frames)
        // -update 1: output single frame
        const ffmpegArgs = [
            '-sseof', '-1',
            '-i', videoPath,
            '-update', '1',
            '-frames:v', '1',
            '-q:v', '2', // High quality
            frameOutputPath
        ];

        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('[Frame Extraction] Success!');
                    resolve();
                } else {
                    console.error('[Frame Extraction] FFmpeg error:', stderr);
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });

        // Verify the frame was created
        if (!fs.existsSync(frameOutputPath)) {
            throw new Error('Frame extraction failed - output file not created');
        }

        // Return the frame URL
        const frameUrl = `/api/comfyui/view-image?filename=${frameFileName}&subfolder=frames`;

        return NextResponse.json({
            success: true,
            frameUrl,
            frameFileName
        });

    } catch (error: any) {
        console.error('[Frame Extraction] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Frame extraction failed',
        }, { status: 500 });
    }
}
