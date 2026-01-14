import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Detect file extension from content type or use .wav as default (Gemini returns WAV)
        const contentType = audioFile.type || 'audio/wav';
        const extension = contentType.includes('wav') ? 'wav' : 'mp3';

        // Generate unique filename with correct extension
        const filename = `gemini-audio-${uuidv4()}.${extension}`;
        const uploadDir = path.resolve('./public/uploads/audio');
        const filePath = path.join(uploadDir, filename);

        // Ensure directory exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Save file
        const bytes = await audioFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        console.log(`[Upload] Saved audio to: ${filePath}`);

        // Return public URL
        const url = `/uploads/audio/${filename}`;
        return NextResponse.json({ success: true, url });

    } catch (error: any) {
        console.error('[Upload] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
