import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Delete a workflow chain session
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('id');

        if (!sessionId) {
            return NextResponse.json({
                success: false,
                error: 'Session ID is required',
            }, { status: 400 });
        }

        const comfyBasePath = path.resolve(process.cwd(), '../ComfyUI');
        const sessionsDir = path.join(comfyBasePath, 'output', 'workflow-sessions');
        const sessionFilePath = path.join(sessionsDir, `${sessionId}.json`);

        if (!fs.existsSync(sessionFilePath)) {
            return NextResponse.json({
                success: false,
                error: 'Session not found',
            }, { status: 404 });
        }

        // Delete the session file
        fs.unlinkSync(sessionFilePath);

        console.log(`[Session Delete] Deleted session: ${sessionId}`);

        return NextResponse.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error: any) {
        console.error('[Session Delete] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete session',
        }, { status: 500 });
    }
}
