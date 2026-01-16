import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to get all files recursively
function getFiles(dir: string, fileList: string[] = [], rootDir: string = '') {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getFiles(filePath, fileList, rootDir);
        } else {
            if (file.endsWith('.safetensors') || file.endsWith('.pt')) {
                // Return relative path from the models/loras root
                const cleanRoot = rootDir.endsWith(path.sep) ? rootDir.slice(0, -1) : rootDir;
                // We want the path relative to the input dir
                const relativePath = filePath.replace(rootDir, '').replace(/^[\\\/]/, '');
                fileList.push(relativePath); // Use raw path, let Windows/Node handle normalization
            }
        }
    });
    return fileList;
}

export async function GET() {
    try {
        // Hardcoded path based on your workspace structure
        // h:\00001.app\release-pack-v6\ComfyUI\models\loras
        // Since we are in fanvue-hub\app\api, we need to go up 4 levels to root, then ComfyUI...
        // Actually, let's use the absolute path we know is correct for this user environment
        // or try to resolve it relative to process.cwd()

        // process.cwd() is likely h:\00001.app\release-pack-v6\fanvue-hub
        const loraBaseDir = path.resolve(process.cwd(), '..', 'ComfyUI', 'models', 'loras');

        if (!fs.existsSync(loraBaseDir)) {
            return NextResponse.json({ success: false, error: 'LoRA directory not found: ' + loraBaseDir });
        }

        const loras = getFiles(loraBaseDir, [], loraBaseDir);

        // Normalize slashes for frontend consistency
        // Update: ComfyUI on Windows expects backslashes in the Enum list for validation.
        // We should return the path as is from the filesystem (which matches ComfyUI's scan).
        const normalizedLoras = loras;

        return NextResponse.json({ success: true, loras: normalizedLoras });
    } catch (error: any) {
        console.error('Error fetching LoRAs:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
