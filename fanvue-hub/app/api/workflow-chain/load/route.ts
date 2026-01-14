import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { WorkflowChainSession } from '@/types/workflow-chain';

/**
 * Load workflow chain sessions
 * GET /api/workflow-chain/load - List all sessions
 * GET /api/workflow-chain/load?id=xxx - Load specific session
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('id');

        const comfyBasePath = path.resolve(process.cwd(), '../ComfyUI');
        const sessionsDir = path.join(comfyBasePath, 'output', 'workflow-sessions');

        // Create directory if it doesn't exist
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
            return NextResponse.json({
                success: true,
                sessions: []
            });
        }

        // If sessionId is provided, load that specific session
        if (sessionId) {
            const sessionFilePath = path.join(sessionsDir, `${sessionId}.json`);

            if (!fs.existsSync(sessionFilePath)) {
                return NextResponse.json({
                    success: false,
                    error: 'Session not found',
                }, { status: 404 });
            }

            const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
            const session: WorkflowChainSession = JSON.parse(sessionData);

            console.log(`[Session Load] Loaded session: ${session.name}`);

            return NextResponse.json({
                success: true,
                session
            });
        }

        // Otherwise, list all sessions
        const sessionFiles = fs.readdirSync(sessionsDir)
            .filter(file => file.endsWith('.json'));

        const sessions: WorkflowChainSession[] = [];

        for (const file of sessionFiles) {
            try {
                const filePath = path.join(sessionsDir, file);
                const sessionData = fs.readFileSync(filePath, 'utf-8');
                const session: WorkflowChainSession = JSON.parse(sessionData);
                sessions.push(session);
            } catch (err) {
                console.warn(`[Session Load] Failed to load session file: ${file}`, err);
            }
        }

        // Sort by updatedAt descending (most recent first)
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);

        console.log(`[Session Load] Found ${sessions.length} sessions`);

        return NextResponse.json({
            success: true,
            sessions
        });

    } catch (error: any) {
        console.error('[Session Load] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to load sessions',
        }, { status: 500 });
    }
}
