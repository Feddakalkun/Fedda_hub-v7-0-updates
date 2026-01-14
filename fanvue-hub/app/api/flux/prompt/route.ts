import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { characterSlug, userPrompt } = await request.json();

        if (!userPrompt) {
            return NextResponse.json({ error: 'Missing userPrompt' }, { status: 400 });
        }

        console.log(`[Flux Prompt] Building NSFW prompt for: ${userPrompt}`);

        // Character-specific LoRA triggers and appearance
        const characterData: Record<string, { lora: string, trigger: string, basePrompt: string }> = {
            'emmy': {
                lora: 'Emmy/emmy_zimage.safetensors',
                trigger: 'ohwx woman',
                basePrompt: 'beautiful young woman with long flowing hair, expressive eyes, flawless skin'
            },
            // Add more characters as needed
        };

        const charInfo = characterData[characterSlug] || characterData['emmy'];

        // Build Flux-optimized prompt
        const fluxPrompt = `${charInfo.trigger}, ${charInfo.basePrompt}, ${userPrompt}, 
photorealistic, ultra detailed, sharp focus, cinematic lighting, professional photography, 
8k uhd, raw photo, dslr, detailed skin texture, natural skin imperfections, realistic proportions, 
depth of field, film grain, natural lighting`;

        const negativePrompt = `cartoon, anime, drawing, painting, illustration, cgi, 3d render, plastic skin, 
doll, fake, unrealistic proportions, deformed, mutated, extra limbs, bad anatomy, blurry, low quality, 
watermark, text, logo, oversaturated`;

        console.log(`[Flux Prompt] Generated: ${fluxPrompt.substring(0, 100)}...`);

        return NextResponse.json({
            success: true,
            prompt: fluxPrompt,
            negativePrompt: negativePrompt,
            lora: charInfo.lora,
            workflow: 'z-image'
        });

    } catch (error: any) {
        console.error('[Flux Prompt] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
