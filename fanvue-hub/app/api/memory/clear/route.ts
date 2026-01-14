import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { characterId, userId = 'user-local' } = await req.json();

        if (!characterId) return NextResponse.json({ error: 'Missing characterId' }, { status: 400 });

        console.log(`[Memory] 🧹 Clearing ALL memories for Character: ${characterId}, User: ${userId}`);

        // Use raw SQL with correct table name (character_memories, not CharacterMemory)
        const result = await (prisma as any).$executeRaw`
            DELETE FROM character_memories 
            WHERE characterId = ${characterId} AND userId = ${userId}
        `;

        console.log(`[Memory] ✅ Deleted ${result} memory records`);

        return NextResponse.json({ success: true, deletedCount: result });
    } catch (e: any) {
        console.error("[Memory] Clear Failed:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
