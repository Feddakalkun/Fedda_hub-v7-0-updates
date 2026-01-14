import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { WorkflowChainSession } from '@/types/workflow-chain';

/**
 * Save a workflow chain session to disk
 */
export async function POST(request: NextRequest) {
    try {
        const session: WorkflowChainSession = await request.json();

        if (!session || !session.id || !session.name) {
            return NextResponse.json({
                success: false,
                error: 'Invalid session data',
            }, { status: 400 });
        }

        // Update timestamp
        session.updatedAt = Date.now();

        // Ensure sessions directory exists
        const comfyBasePath = path.resolve(process.cwd(), '../ComfyUI');
        const sessionsDir = path.join(comfyBasePath, 'output', 'workflow-sessions');

        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
        }

        // Save session as JSON
        const sessionFilePath = path.join(sessionsDir, `${session.id}.json`);
        fs.writeFileSync(sessionFilePath, JSON.stringify(session, null, 2), 'utf-8');

        console.log(`[Session Save] Saved session: ${session.name} (${session.id})`);

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            message: `Session "${session.name}" saved successfully`
        });

    } catch (error: any) {
        console.error('[Session Save] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to save session',
        }, { status: 500 });
    }
}
