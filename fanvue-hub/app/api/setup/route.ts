import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            clientId, clientSecret,
            geminiApiKey, falApiKey, elevenLabsApiKey,
            comfyuiUrl,
            // New Keys
            azureSpeechKey, azureSpeechRegion,
            googleCloudTtsKey,
            awsAccessKeyId, awsSecretAccessKey, awsRegion,
            uberduckApiKey, uberduckApiSecret
        } = body;

        // 🛠️ DATABASE REPAIR: Ensure columns exist manually (SQLite ignores redundant adds if handled carefully)
        try {
            await (prisma as any).$executeRawUnsafe(`ALTER TABLE AppConfig ADD COLUMN uberduckApiKey TEXT`);
        } catch (e) { }
        try {
            await (prisma as any).$executeRawUnsafe(`ALTER TABLE AppConfig ADD COLUMN uberduckApiSecret TEXT`);
        } catch (e) { }

        // Upsert the global configuration (everything EXCEPT Uberduck keys which Prisma Client doesn't know yet)
        await prisma.appConfig.upsert({
            where: { id: 'global' },
            update: {
                ...(clientId && { clientId }),
                ...(clientSecret && { clientSecret }),
                ...(geminiApiKey && { geminiApiKey }),
                ...(falApiKey && { falApiKey }),
                ...(elevenLabsApiKey && { elevenLabsApiKey }),
                ...(comfyuiUrl && { comfyuiUrl }),

                // Update New Keys
                ...(azureSpeechKey && { azureSpeechKey }),
                ...(azureSpeechRegion && { azureSpeechRegion }),
                ...(googleCloudTtsKey && { googleCloudTtsKey }),
                ...(awsAccessKeyId && { awsAccessKeyId }),
                ...(awsSecretAccessKey && { awsSecretAccessKey }),
                ...(awsRegion && { awsRegion }),

                setupCompleted: true,
            },
            create: {
                id: 'global',
                clientId: clientId || '',
                clientSecret: clientSecret || '',
                geminiApiKey: geminiApiKey || '',
                falApiKey: falApiKey || '',
                elevenLabsApiKey: elevenLabsApiKey || '',
                comfyuiUrl: comfyuiUrl || 'http://127.0.0.1:8188',

                // Create New Keys
                azureSpeechKey: azureSpeechKey || '',
                azureSpeechRegion: azureSpeechRegion || 'eastus',
                googleCloudTtsKey: googleCloudTtsKey || '',
                awsAccessKeyId: awsAccessKeyId || '',
                awsSecretAccessKey: awsSecretAccessKey || '',
                awsRegion: awsRegion || 'us-east-1',

                setupCompleted: true,
            },
        });

        // 🛠️ RAW SQL FALLBACK: Update Uberduck keys directly
        if (uberduckApiKey !== undefined) {
            const keyVal = uberduckApiKey || '';
            await (prisma as any).$executeRaw`UPDATE AppConfig SET uberduckApiKey = ${keyVal} WHERE id = 'global'`;
        }
        if (uberduckApiSecret !== undefined) {
            const secretVal = uberduckApiSecret || '';
            await (prisma as any).$executeRaw`UPDATE AppConfig SET uberduckApiSecret = ${secretVal} WHERE id = 'global'`;
        }

        console.log('[Setup] App configuration updated successfully.');
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Setup] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const configRaw = await (prisma as any).$queryRawUnsafe(`SELECT * FROM AppConfig WHERE id = 'global' LIMIT 1`);
    const config = (configRaw as any[])?.[0];

    return NextResponse.json({
        setupCompleted: config?.setupCompleted || false,
        config: {
            clientId: config?.clientId || '',
            hasClientSecret: !!config?.clientSecret,
            geminiApiKey: config?.geminiApiKey ? '••••••••' + config.geminiApiKey.slice(-4) : '',
            falApiKey: config?.falApiKey ? '••••••••' + config.falApiKey.slice(-4) : '',
            elevenLabsApiKey: config?.elevenLabsApiKey ? '••••••••' + config.elevenLabsApiKey.slice(-4) : '',
            comfyuiUrl: config?.comfyuiUrl || 'http://127.0.0.1:8188',

            // Return New Keys (Masked)
            azureSpeechKey: config?.azureSpeechKey ? '••••••••' + config.azureSpeechKey.slice(-4) : '',
            azureSpeechRegion: config?.azureSpeechRegion || '',
            googleCloudTtsKey: config?.googleCloudTtsKey ? '••••••••' + config.googleCloudTtsKey.slice(-4) : '',
            awsAccessKeyId: config?.awsAccessKeyId ? '••••••••' + config.awsAccessKeyId.slice(-4) : '',
            awsSecretAccessKey: config?.awsSecretAccessKey ? '••••••••' + config.awsSecretAccessKey.slice(-4) : '',
            awsRegion: config?.awsRegion || '',
            uberduckApiKey: (config as any)?.uberduckApiKey ? '••••••••' + (config as any).uberduckApiKey.slice(-4) : '',
            uberduckApiSecret: (config as any)?.uberduckApiSecret ? '••••••••' + (config as any).uberduckApiSecret.slice(-4) : '',
        }
    });
}
