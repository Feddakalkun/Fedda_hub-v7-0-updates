import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CROSSFADE_DURATION = 0.5; // seconds

/**
 * Combine multiple video clips with crossfade transitions
 * Preserves audio from lipsync clips
 */
export async function POST(request: NextRequest) {
    try {
        const { clips } = await request.json();

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Clips array is required and must not be empty',
            }, { status: 400 });
        }

        const comfyBasePath = path.resolve(process.cwd(), '../ComfyUI');
        const outputDir = path.join(comfyBasePath, 'output');
        const workflowVideosDir = path.join(outputDir, 'workflow-videos');

        // Ensure output directory exists
        if (!fs.existsSync(workflowVideosDir)) {
            fs.mkdirSync(workflowVideosDir, { recursive: true });
        }

        // Helper function to find video file
        const findVideoFile = (videoUrl: string): string | null => {
            let fileName = '';
            try {
                const urlObj = new URL(videoUrl, 'http://localhost');
                const params = new URLSearchParams(urlObj.search);
                if (params.has('filename')) {
                    fileName = params.get('filename')!;
                } else {
                    fileName = path.basename(urlObj.pathname);
                }
            } catch {
                fileName = path.basename(videoUrl);
            }

            const possiblePaths = [
                path.join(outputDir, fileName),
                path.join(outputDir, 'lipsync', fileName),
                path.join(outputDir, 'wan21', fileName),
                path.join(outputDir, 'workflow-videos', fileName),
                path.join(outputDir, 'comfyui', fileName),
            ];

            for (const tryPath of possiblePaths) {
                if (fs.existsSync(tryPath)) {
                    return tryPath;
                }
            }

            return null;
        };

        // Resolve all video paths
        const videoPaths = [];
        for (const clip of clips) {
            const videoPath = findVideoFile(clip.url);
            if (!videoPath) {
                return NextResponse.json({
                    success: false,
                    error: `Video file not found for clip: ${clip.url}`,
                }, { status: 404 });
            }
            videoPaths.push({
                path: videoPath,
                hasAudio: clip.type === 'lipsync' && clip.audioUrl,
                type: clip.type
            });
        }

        console.log(`[Video Combine] Combining ${videoPaths.length} clips...`);

        // Generate output filename
        const outputFileName = `combined_${Date.now()}.mp4`;
        const outputPath = path.join(workflowVideosDir, outputFileName);

        // If only one video, just copy it
        if (videoPaths.length === 1) {
            fs.copyFileSync(videoPaths[0].path, outputPath);
            console.log('[Video Combine] Single video - copied directly');

            const resultUrl = `/api/comfyui/view-image?filename=${outputFileName}&subfolder=workflow-videos`;
            return NextResponse.json({
                success: true,
                videoUrl: resultUrl,
                videoFileName: outputFileName
            });
        }

        // Build FFmpeg filter complex for crossfades and audio mixing
        // For N videos, we need N-1 crossfade operations
        const filterComplex = buildFilterComplex(videoPaths.length);

        // Build FFmpeg command
        const ffmpegArgs = [
            '-y', // Overwrite output
        ];

        // Add all input files
        videoPaths.forEach(video => {
            ffmpegArgs.push('-i', video.path);
        });

        // Add filter complex
        ffmpegArgs.push('-filter_complex', filterComplex);

        // Map output
        ffmpegArgs.push('-map', '[outv]');
        ffmpegArgs.push('-map', '[outa]');

        // Output settings
        ffmpegArgs.push(
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            outputPath
        );

        console.log('[Video Combine] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

        // Execute FFmpeg
        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            let stderr = '';
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
                // Could parse progress here if needed
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('[Video Combine] Success!');
                    resolve();
                } else {
                    console.error('[Video Combine] FFmpeg error:', stderr);
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });

        // Verify output
        if (!fs.existsSync(outputPath)) {
            throw new Error('Video combination failed - output file not created');
        }

        const resultUrl = `/api/comfyui/view-image?filename=${outputFileName}&subfolder=workflow-videos`;

        return NextResponse.json({
            success: true,
            videoUrl: resultUrl,
            videoFileName: outputFileName
        });

    } catch (error: any) {
        console.error('[Video Combine] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Video combination failed',
        }, { status: 500 });
    }
}

/**
 * Build FFmpeg filter complex for crossfading N videos
 */
function buildFilterComplex(numVideos: number): string {
    if (numVideos === 1) {
        return '[0:v]copy[outv];[0:a]anull[outa]';
    }

    const filters = [];

    // For N videos, we perform N-1 crossfades
    for (let i = 0; i < numVideos - 1; i++) {
        const input1 = i === 0 ? `[0:v]` : `[v${i}]`;
        const input2 = `[${i + 1}:v]`;
        const output = i === numVideos - 2 ? '[outv]' : `[v${i + 1}]`;

        // xfade filter with offset (each video fades into the next)
        filters.push(`${input1}${input2}xfade=transition=fade:duration=${CROSSFADE_DURATION}:offset=0${output}`);
    }

    // Mix all audio streams
    const audioMix = [];
    for (let i = 0; i < numVideos; i++) {
        audioMix.push(`[${i}:a]`);
    }
    filters.push(`${audioMix.join('')}amix=inputs=${numVideos}:duration=longest[outa]`);

    return filters.join(';');
}
