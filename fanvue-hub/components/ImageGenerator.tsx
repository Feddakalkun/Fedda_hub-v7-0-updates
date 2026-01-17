'use client';

import { useState, useEffect, useRef } from 'react';
import { useComfyProgress } from '@/hooks/useComfyProgress';

interface GeneratedImageData {
    url: string;
    prompt: string;
    timestamp: number;
}

interface ImageGeneratorProps {
    characterSlug: string;
    characterName: string;
    loraPath?: string;
    appearance?: string;
    generatedImages: string[];
    setGeneratedImages: (images: string[] | ((prev: string[]) => string[])) => void;
}

export default function ImageGenerator({
    characterSlug,
    characterName,
    loraPath,
    appearance,
    generatedImages,
    setGeneratedImages
}: ImageGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(1);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('1:1'); // Default to square

    // Internal state to track generated images with metadata
    const [generatedImagesData, setGeneratedImagesData] = useState<GeneratedImageData[]>([]);

    // Appearance customization sliders


    // Queue system
    interface QueueItem {
        id: string;
        prompt: string;
        fullPrompt: string; // The complete prompt with appearance modifiers
        numImages: number;
        aspectRatio: string;

    }
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const isProcessingRef = useRef(false);



    const { state: progressState, startMonitoring, reset: resetProgress } = useComfyProgress();

    // Add current settings to queue
    const addToQueue = () => {
        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        const fullPromptText = `${appearance ? appearance + ', ' : ''}${prompt.trim()}, hyper-realistic 8K portrait, raw unfiltered photo, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, imperfect skin, natural complexion, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography, distinct facial features`;

        const newItem: QueueItem = {
            id: Date.now().toString() + Math.random(),
            prompt: prompt.trim(),
            fullPrompt: fullPromptText,
            numImages,
            aspectRatio,

        };

        setQueue(prev => [...prev, newItem]);
        setPrompt(''); // Clear prompt for next entry
    };

    // Process the queue
    const processQueue = async () => {
        // Prevent concurrent processing and check if queue is empty
        if (isProcessingRef.current || queue.length === 0) {
            return;
        }

        isProcessingRef.current = true;

        // Always process first item in queue
        const item = queue[0];
        console.log(`🔄 Processing item: ${item.prompt.substring(0, 50)}... (${queue.length} in queue)`);

        try {
            // Start generation
            const res = await fetch(`/api/comfyui/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterSlug,
                    prompt: item.fullPrompt,
                    negativePrompt: `ugly, deformed, blurry, low quality, plastic skin, doll-like, airbrushed, over-smoothed, CGI, 3D render, cartoon, anime, illustration, painting, drawing, bad anatomy, extra fingers, asymmetrical eyes, cross-eyed, watermark, text, logo, low-res, blur, artificial lighting, oversaturated`,
                    numImages: item.numImages,
                    loraPath,
                    aspectRatio: item.aspectRatio,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                console.error('❌ Generation failed:', data.error);
                // Remove failed item from queue
                setQueue(prev => prev.slice(1));
                isProcessingRef.current = false;
                return;
            }

            // Start monitoring
            startMonitoring(data.promptId);

            // Poll for completion (this will wait until done)
            await pollForCompletion(data.promptId, item.fullPrompt);

            console.log('✅ Item completed, removing from queue');

            // Remove completed item from queue
            setQueue(prev => prev.slice(1));

        } catch (e) {
            console.error('❌ Generation error:', e);
            // Remove failed item
            setQueue(prev => prev.slice(1));
        } finally {
            isProcessingRef.current = false;

            // Small delay before processing next item
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    };

    // Cancel queue processing
    const cancelQueue = () => {
        console.log('🛑 Cancelling queue and interrupting ComfyUI...');

        // Clear queue and reset state
        setQueue([]);
        isProcessingRef.current = false;
        resetProgress();

        // Actually interrupt ComfyUI's current generation
        fetch('/api/comfyui/interrupt', { method: 'POST' })
            .then(() => console.log('✅ ComfyUI interrupted'))
            .catch(e => console.error('❌ Failed to interrupt ComfyUI:', e));
    };



    // Start queue processing when items are added
    useEffect(() => {
        if (queue.length > 0 && !isProcessingRef.current) {
            console.log(`🚀 Starting queue with ${queue.length} items`);
            processQueue();
        }
    }, [queue.length]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        if (!loraPath) {
            alert('No LoRA configured for this character. Please set it in Settings.');
            return;
        }

        try {
            // Start generation
            const res = await fetch(`/api/comfyui/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterSlug,
                    prompt: `${appearance ? appearance + ', ' : ''}${prompt}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`,
                    negativePrompt: `ugly, deformed, blurry, low quality, no plastic skin, no beauty filters, no over-smooth retouching, no deformed face, no bad anatomy, no extra fingers, no asymmetrical eyes, no cross-eyed gaze, no watermark, no text, no logo, no low-res, no blur`,
                    numImages,
                    loraPath,
                    aspectRatio,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                alert('Failed to start generation: ' + data.error);
                return;
            }

            // Start monitoring
            startMonitoring(data.promptId);

            // Poll for completion
            const fullPromptText = `${appearance ? appearance + ', ' : ''}${prompt}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`;
            pollForCompletion(data.promptId, fullPromptText);

        } catch (e) {
            console.error('Generation error:', e);
            alert('Failed to generate images');
        }
    };

    const pollForCompletion = async (promptId: string, fullPrompt: string) => {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;

        const checkStatus = async (): Promise<boolean> => {
            try {
                const res = await fetch(`/api/comfyui/status/${promptId}`);
                const data = await res.json();

                if (data.status === 'success' && data.outputs && data.outputs.length > 0) {
                    // Save images with prompt metadata
                    const newImagesData: GeneratedImageData[] = data.outputs.map((url: string) => ({
                        url,
                        prompt: fullPrompt,
                        timestamp: Date.now()
                    }));
                    setGeneratedImagesData(prev => [...newImagesData, ...prev]);
                    setGeneratedImages(prev => [...data.outputs, ...prev]);
                    resetProgress();

                    return true;
                }

                if (data.status === 'error') {
                    alert('Generation failed: ' + data.error);
                    resetProgress();
                    return true;
                }

                // Continue polling
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return checkStatus();
                } else {
                    alert('Generation timed out');
                    resetProgress();
                    return true;
                }

            } catch (e) {
                console.error('Polling error:', e);
                resetProgress();
                return true;
            }
        };

        await new Promise(resolve => setTimeout(resolve, 5000));
        return checkStatus();
    };

    const [isPosting, setIsPosting] = useState<string | null>(null);

    const handlePostToFanvue = async (imageUrl: string) => {
        // Generate natural viral caption from SOME guide strategies
        const captions = [
            // FOMO & Urgency Tactics
            "Just vibing ✨",
            "Caught this moment just for you… 💕",
            "This is just the beginning. Want to see what happens next? 👀",
            "Too hot for the feed 🔥",
            "First 10 subscribers get something special 🎁",
            "24 hours only... don't miss out ⏰",

            // Relatable & Engaging
            "Feeling cute today 💕",
            "New post for you 😊",
            "Hey loves! 💖",
            "Mood 💫",
            "Good vibes only ✌️",
            "Living my best life 🌟",
            "Hope you enjoy this one 😘",
            "Sweet moments 🍃",
            "Just me being me 💁‍♀️",

            // Trendy & Bold
            "Enjoying my day ☀️",
            "For my favorites 💝",
            "Catching some sun ☀️",
            "Felt cute, might delete later 🙈",
            "New content alert! 🔔",
            "Serving looks, not apologies ✨",
            "2025 energy: unstoppable 💫",
            "Currently vibing at peak aesthetic 📸",

            // Curiosity Gaps
            "Wait for it... 👀",
            "More where this came from 💕",
            "This is what happens when... 😏",
            "You won't believe what's next 🤫",
            "Part 2 is too much for here... 👉",

            // Direct / Conversion
            "Want exclusive access? Link in bio 🔗",
            "This is just a preview 😉",
            "More on my VIP page 💎",
            "Already subscribed? Comment your fav! 💖",

            // Engagement Questions
            "What would you like to see next?💭",
            "This or that? Let me know! 🤔",
            "Comment if you're still awake 👇",
            "Tag someone who needs this 🏷️",
            "Double tap if you agree 💕",

            // Season/Trend Specific  
            "Making memories ✨",
            "Golden hour hits different 🌅",
            "Cozy season vibes 🍂",
            "New year, new content 🎆",
            "Weekend mood activated 🌟"
        ];
        const randomCaption = captions[Math.floor(Math.random() * captions.length)];

        if (!confirm(`Post this image to Fanvue with caption: "${randomCaption}"?`)) return;

        setIsPosting(imageUrl);
        try {
            const res = await fetch(`/api/characters/${characterSlug}/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl,
                    caption: randomCaption,
                    isSubscriberOnly: false
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Success! Image posted to Fanvue.');
            } else {
                alert('Failed to post: ' + data.error);
            }
        } catch (e) {
            alert('Failed to post to Fanvue');
        } finally {
            setIsPosting(null);
        }
    };

    const handleSaveToLibrary = async (imageUrl: string) => {
        try {
            const res = await fetch(`/api/characters/${characterSlug}/save-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Image saved to library!');
            } else {
                alert('Failed to save: ' + data.error);
            }
        } catch (e) {
            alert('Failed to save image');
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: '100%' }}>
            {/* Left Panel - Controls */}
            <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                        Text to Image Generator
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Generate images for {characterName} using ComfyUI
                    </p>
                </div>

                {/* Prompt */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: '#ccc', fontWeight: '600' }}>
                        Prompt
                    </label>

                    {/* Preset Dropdowns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        {/* Lifestyle Prompts Dropdown */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#999' }}>
                                Lifestyle & Casual
                            </label>
                            <select
                                onChange={(e) => e.target.value && setPrompt(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                                defaultValue=""
                            >
                                <option value="">Select a lifestyle prompt...</option>
                                <option value="Young woman standing barefoot on bathroom tiles holding iPhone, distorted reflection in steamed-up mirror, wearing oversized vintage gray band t-shirt slipping off shoulder, messy blonde loose waves, biting lower lip, morning light through frosted window">🪞 Morning Mirror</option>
                                <option value="Sitting on concrete pool edge legs dangling in blue water, white triangle bikini top, tan lines, wet dark hair slicked back, laughing, golden sunlight rim lighting, palm tree shadows on deck, colorful towel nearby">🌊 Poolside Swim</option>
                                <option value="Walking down city sidewalk wearing AirPods, cropped black leather jacket, high-waisted mom jeans, late afternoon golden hour light, neon coffee shop signs, neon reflections in wet pavement, urban street background">🏙️ City Phone Call</option>
                                <option value="Sitting cross-legged on unmade bed, tangled white sheets, stretching arms overhead, yawning, wearing oversized gray heather t-shirt slipping off shoulder, steaming coffee mug in hand, morning sunlight through sheer curtains">😴 Bedroom Stretch</option>
                                <option value="Sitting at café window gazing out, sipping iced coffee, wearing cream cable-knit sweater, thin gold necklace, laptop open on table, croissant on plate, street reflection in glass, bokeh street background">☕ Café Window</option>
                                <option value="Leaning out passenger car window, wind blowing hair, aviator sunglasses on forehead, black leather jacket, white lace bralette, sunset highway background, motion blur, laughing freedom moment">🚗 Road Trip Wind</option>
                                <option value="Sitting on gym floor cross-legged, holding blue water bottle, wearing neon green sports bra and black biker shorts, sweat on skin, messy high ponytail, gym equipment background, post-workout glow">💪 Gym Water Break</option>
                                <option value="Sitting on kitchen counter legs swinging, holding coffee mug, wearing white spaghetti strap tank top, messy hair claw clip, marble countertops, morning sunlight, sunlit white cabinets">🥑 Kitchen Counter</option>
                                <option value="Standing in mirrored elevator adjusting blazer, black tailored jacket, cream lace camisole, pencil skirt, red matte lips, gold hoop earrings, elevator floor numbers illuminated, confident pose">💼 Elevator Power</option>
                                <option value="Curled up on park bench, autumn leaves background, chunky oatmeal knit sweater, rust scarf, reading paperback novel, golden hour light, peaceful expression, crisp fall air atmosphere">🍂 Park Reading</option>
                                <option value="Standing on rooftop ledge, cityscape skyline background, ivory satin slip dress blowing in wind, tousled hair, sunset golden light rim lighting, high-fashion editorial look">🌆 Rooftop Sunset</option>
                                <option value="Leaning over cluttered desk studying, wearing glasses and sage green sweater, messy bun, textbooks and laptop, late night study lamp lighting, focused expression">📚 Late Night Study</option>
                                <option value="Sitting on beach towel, colorful mexican blanket, white bikini top, wet hair, ocean waves crashing background, golden sand, seashells, sunny tropical beach atmosphere">🏖️ Beach Towel</option>
                                <option value="Walking down marble staircase, hand on railing, charcoal silk skirt, cream blouse, confident stride, grand foyer background, dramatic overhead lighting">👠 Staircase Descend</option>
                                <option value="Curled on gray velvet sofa reading iPad, ivory cashmere sweater, thigh-high socks, cozy mood, afternoon light through curtains, textured scatter pillows">🛋️ Sofa Weekend</option>
                                <option value="Standing on urban street corner laughing, black leather jacket, ripped jeans, combat boots, neon bar signs night background, candid nightlife atmosphere">🌃 Street Laugh</option>
                                <option value="Standing at bathroom double sink, wearing dusty rose silk kimono robe, applying skincare serum, messy hair clip, marble counter, mirror reflection, morning routine">🧴 Skincare Ritual</option>
                                <option value="Sitting in circle on grass at music festival, glitter on shoulders, iridescent crop top, cargo skirt, platform boots, glow sticks, festival lights background, night atmosphere">🎪 Festival Energy</option>
                                <option value="Driving car at sunset, taking selfie, avaiator sunglasses, leather jacket, white tank top, windblown hair, dashboard lights, golden hour road trip aesthetic">🌅 Driving Sunset</option>
                                <option value="Sitting at café window table, iced latte, cream sweater, reading glasses, laptop, street view through glass, morning coffee shop ambiance, natural lighting">☕ Café Creative</option>
                                <option value="Lying stomach-down on bed scrolling phone, oversized gray t-shirt, bare legs, night mode screen glow on face, dark bedroom atmosphere, star stickers on ceiling">📱 Phone Scroll</option>
                                <option value="Swinging on park swing, flowy cream sundress, golden hour backlight, blurred trees background, hair blowing, nostalgic playful mood">🌳 Park Swing</option>
                                <option value="Dancing in kitchen holding wooden spoon, black tank top, gray boxer shorts, messy morning hair, marble island, sunlit breakfast scene, candid joy">🎵 Kitchen Dance</option>
                                <option value="Leaning on balcony railing drinking coffee, oversized ivory sweater, city morning haze background, messy hair, urban sunrise view, peaceful morning moment">🌇 Balcony Coffee</option>
                            </select>
                        </div>

                        {/* NSFW/Spicy Prompts Dropdown */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#888' }}>
                                Spicy & Intimate
                            </label>
                            <select
                                onChange={(e) => e.target.value && setPrompt(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                                defaultValue=""
                            >
                                <option value="">Select a spicy prompt...</option>
                                <option value="Bedroom natural morning light streams through sheer white curtains woman kneels on unmade bed facing away camera looking back over left shoulder flirty playful smile wearing completely sheer white mesh tank top arms raised overhead stretching fabric rides up exposing lower back dimples smooth tanned skin high-waisted ivory lace French-cut panties hugging curves perfectly fabric delicate detailed visible through morning light bare feet tucked under her messy blonde beach waves cascade down spine catching golden sunlight scattered white cotton sheets tangled around knees one pillow fallen floor hardwood visible edge frame intimate girlfriend morning moment captured mid-laugh right before she turns around completely natural unposed authentic bedroom energy palpable">💫 Sheer Morning Stretch</option>
                                <option value="Standing floor-to-ceiling bedroom window backlit by golden hour sunset cityscape twenty stories below woman stands profile gazing out wearing completely transparent white silk slip dress fabric so sheer every curve visible silhouette perfect rim lighting glows around edges body bare skin tone visible through gossamer fabric thin straps barely holding garment on shoulders dress hem mid-thigh swaying slightly from air conditioning breeze bare feet planted hip-width apart one hand touches window glass cool against fingertips other hand rests hip casual confident pose messy bun hair few strands escaped frame face side profile shows peaceful expression contemplating sunset city lights beginning twinkle below intimate private moment woman alone with thoughts beautiful vulnerable powerful simultaneously">🌇 Sunset Silhouette</option>
                                <option value="Sitting edge outdoor infinity pool sunrise legs dangling in crystal clear turquoise water back facing camera turning head right shoulder showing side profile playful wink wearing minuscule white Brazilian bikini bottom fabric barely covers anything string ties rest on hip bones tan lines visible smooth tanned skin water droplets roll down spine catching sunrise light completely topless bare back exposed shoulder blades defined toned athletic physique wet dark hair slicked back dripping water shoulders pool deck exotic hardwood scattered white orchid petals floating pool surface around her luxury villa background soft-focus palm fronds sway gentle morning breeze intimate vacation moment pure freedom joy palpable stolen private paradise instant">🌊 Poolside Sunrise Bare</option>
                                <option value="Leaning against kitchen marble countertop early morning soft sunlight natural window light woman faces camera direct eye contact sultry sleepy smile biting lower lip playfully wearing oversized white men's dress shirt completely unbuttoned hanging open both shoulders fabric parts center revealing smooth flat stomach delicate collarbones upper chest visible nothing underneath shirt ends mid-thigh bare legs crossed at ankle leaning back both palms flat on cold marble counter behind her pushing chest forward slightly messy bed hair tousled natural no makeup glowing skin steam rising from black coffee mug counter beside her scattered toast crumbs jam knife intimate morning-after energy boyfriend's shirt stolen perfect girlfriend aesthetic captured exactly right moment before she buttons it up">☕ Borrowed Shirt Morning</option>
                                <option value="Full-length mirror selfie bedroom soft afternoon light woman stands holding iPhone chest height capturing reflection wearing high-waisted black lace Brazilian thong nothing else topless bare chest visible perfect proportions smooth skin natural one hand holds phone other arm crosses chest casually covering strategic areas while still showing curves side underboob visible playful confident expression messy blonde hair loose waves frame face bedroom visible background reflection unmade bed clothes scattered floor intimate personal mirror moment slight smile knowing exactly how good she looks casual confidence radiates through screen girlfriend spontaneous selfie energy captured mid-pose right before she sends it">🪞 Mirror Confidence</option>
                                <option value="Lying stomach-down white hotel bed sheets crisp wrinkled from movement woman propped up on elbows facing camera over shoulder looking back sultry playful smile wearing absolutely tiny black g-string thong disappears between perfectly round tight athletic buttocks cheeks smooth spray-tanned skin back completely bare shoulder blades defined toned legs bent at knees feet crossed air swaying back and forth playfully morning sunlight streams floor-to-ceiling windows Paris cityscape visible background soft-focus Eiffel Tower distance messy bedhead hair spread white pillow one hand props chin other traces patterns on sheet intimate hotel morning moment vacation freedom energy palpable stolen private luxury instant girlfriend teasing energy radiates">🍑 Hotel Tease</option>
                                <option value="Bathroom steamed mirror droplets condensation running down glass woman just stepped from shower wrapped in white fluffy towel covering chest holding it with one hand other hand wipes steam from mirror section clearing space for reflection towel barely covers ending high on thighs wet hair dripping shoulders water beads collarbone catching overhead vanity lighting bare legs visible tan skin glowing from hot shower scattered skincare products marble counter pink loofah hanging shower rack visible background steam still risingからglass shower door intimate post-shower routine moment natural no-makeup fresh-faced beauty girlfriend caught getting ready authentic private bathroom instant">🛁 Steamy Shower Exit</option>
                                <option value="Bending forward at waist tying white sneaker laces yoga studio mirror wall background woman wears skintight black high-waisted yoga pants fabric stretched absolutely taut across perfectly round athletic buttocks every curve defined hugging body like second skin tiny pink sports bra shows toned midriff flat stomach visible bent over position hair falls forward messy ponytail yoga mat rolled up beside her water bottle reflection shows focused expression concentrated on tying shoes mirror captures side angle showing curves silhouette perfect athletic physique post-workout glow sweat sheen catches studio lighting intimate gym moment casual confidence girlfriend fitness journey aesthetic">🧘 Yoga Pants Bend</option>
                                <option value="Standing tippy-toes reaching high shelf closet back arched naturally from stretch woman wears cropped white ribbed tank top rides up completely exposing smooth tanned midriff lower back showing hint of dimples above waistband tiny pale pink boy-short panties low-rise sitting on hips fabric detailed lace trim visible bedroom soft natural daylight messy walk-in closet visible scattered shoe boxes designer heels arm stretched overhead reaching for hat top shelf other hand steadies balance against doorframe casual intimate girlfriend moment getting dressed choosing outfit authentic domestic scene captured mid-reach unaware of how effortlessly sexy simple moment becomes">👗 Closet Reach</option>
                                <option value="Sitting cross-legged bedroom floor beside bed painting toenails concentrated expression tongue between teeth slightly woman wears loose-fitting gray oversized university sweatshirt hangs off one shoulder collarbone visible neckline fabric drapes forward showing hint of bare chest underneath tiny white cotton panties high-cut legs visible crossed position afternoon sunlight streams window catches particles floating air scattered nail polish bottles tissues cotton balls around her messy brunette hair claw-clipped up casual relaxed intimate weekend beauty routine moment girlfriend energy pure authentic domestic bliss vulnerability captured exactly right instant before she notices camera looking up with surprised laugh">💅 Polish & Chill</option>
                                <option value="Lying back against plush velvet headboard luxury hotel bed tangled silk sheets around waist woman stretches both arms overhead arching back naturally yawning genuine sleepy smile wearing delicate ivory lace bralette see-through mesh panels between lace appliqué smooth tanned skin visible through sheer fabric matching high-waisted lace Brazilian panties ivory detailed embroidery morning light filters gauzy curtains behind her bedside champagne bucket empty glasses scattered rose petals white sheets messy bedroom hair spread against burgundy velvet intimate morning-after luxury energy vacation romance vibes girlfriend waking up slowly savoring lazy morning captured mid-stretch right before room service knock">🥂 Luxury Morning After</option>
                                <option value="Kneeling in bathtub facing away camera looking back over shoulder playful smile bubble bath foam strategically covering strategic areas but leaving smooth tanned back completely visible water line at lower back hint of curves beneath surface woman's wet hair piled high messy bun few strands escaped stick to neck rose petals floating bath surface candles flickering bathroom counter wine glass balanced tub edge marble bathroom walls soft candlelight creates romantic glow intimate self-care evening moment girlfriend bath night aesthetic captured exactly perfect instant before she throws handful of bubbles at camera laughing">🛀 Bubble Bath Tease</option>
                                <option value="Standing bedroom doorway leaning against frame arms crossed underneath chest pushing up naturally woman wears black satin slip dress incredibly thin fabric clings to every curve completely backlit by bedroom lamp behind her creating silhouette effect body outline visible through sheer satin thin straps fall loosely on shoulders dress hem ends mid-thigh bare legs visible smoky eye makeup dark lipstick tousled bedroom hair sultry confident expression Friday night going-out energy date night ready girlfriend showing off new dress waiting for reaction intimate doorway moment captured right before she asks does this look okay perfect confident sexy energy radiates">🖤 Satin Slip Doorway</option>
                                <option value="Sitting edge unmade bed morning sunlight woman looks down at phone scrolling smiling at messages wearing loose white button-up pajama shirt open revealing black lace bralette underneath shirt hangs open both sides bare midriff visible matching black lace boy-short panties legs tucked under her messy blonde morning hair natural no-makeup glow coffee mug steaming on nightstand beside scattered phone charger AirPods case intimate lazy Sunday morning texting energy girlfriend responding to good morning messages biting lip smiling at screen authentic sweet intimate relationship moment captured mid-smile right before she looks up and notices you watching">📱 Morning Messages</option>
                                <option value="Bent over bathroom counter applying mascara face inches from mirror concentrated expression lips parted slightly woman wears tiny pink satin robe barely covers anything tied loosely at waist falling open revealing smooth legs bare to upper thigh back arched naturally from leaning forward position robe back rides up showing hint of matching pink lace panties beneath bathroom vanity lighting perfect makeup scattered products lipstick brushes hair in hot rollers preparing for night out intimate getting-ready ritual girlfriend beauty routine moment captured from doorway angle watching her prepare authentic domestic intimacy vulnerability focus concentration beautiful">💄 Getting Ready Lean</option>
                                <option value="Lying sideways across bed diagonal white cotton sheets woman scrolls laptop propped on pillows watching show casual relaxed pose wearing cropped gray hoodie ending just below bust bare midriff completely visible smooth tanned skin tiny black thong high-cut legs ride up on hips fabric minimal visible beneath hoodie hem legs stretched out crossed at ankles bare feet painted toenails messy hair spread pillow laptop screen glow illuminates face soft evening bedroom lighting scattered snack wrappers water bottle intimate Netflix-and-chill energy girlfriend lazy evening vibes authentic casual comfort captured mid-laugh at something funny on screen">📺 Lazy Evening Watch</option>
                                <option value="Walking up stairs captured from behind below angle looking up woman ascending hardwood staircase hand sliding up wooden banister wearing extremely short pale pink sleep shorts fabric barely covers round athletic buttocks cheeks curve visible bottom hem loose white tank top back view shoulders visible messy morning ponytail swaying with each step bare feet on stairs morning sunlight streams window landing above casual intimate girlfriend morning moment going upstairs aesthetic captured mid-step natural movement perfect angle showcasing athletic physique confident casual energy morning routine authentic domestic moment stolen glance following her upstairs">🪜 Staircase Ascent</option>
                                <option value="Seated at vanity table applying lipstick focused expression leaning toward large illuminated mirror woman wears silky ivory robe completely open tied loosely at waist revealing black lace lingerie set underneath bralette and high-waisted panties vintage-inspired detailed lace work visible through open robe elegant vanity scattered with luxury makeup products perfume bottles jewelry boxes soft warm lighting from mirror bulbs hair in vintage curls 1940s glamour vibes red lipstick application concentrated precision intimate boudoir preparation moment girlfriend getting glamorous captured from slight side angle reflection visible in mirror classic Hollywood elegance meets modern intimacy">💋 Vanity Glamour</option>
                                <option value="Stretching in bed just waking arms raised overhead arching back naturally genuine yawn woman wears thin white cotton camisole with built-in shelf bra fabric slightly transparent morning light shows faint outline through material spaghetti straps slide off shoulders naturally from stretching movement matching white cotton boy-short panties visible as sheets tangled around waist fallen to hips during sleep messy bedhead hair spread across pillow morning sunlight filters sheer curtains dust motes floating air intimate genuine waking moment girlfriend morning stretch completely natural unposed authentic sleepy beauty captured right at dawn perfect vulnerable peaceful energy">🌅 Dawn Stretch</option>
                                <option value="Standing in walk-in closet trying on outfit checking fit in full-length mirror woman holds phone taking mirror selfie wearing high-waisted distressed denim shorts incredibly short showing long tanned legs buttoned but unzipped slightly loose white cropped tank top tied knot at side showing toned midriff flat stomach bare feet closet visible background clothes hanging racks shoe collection floor messy trying-on chaos scattered hangers intimate getting-ready decision moment girlfriend seeking outfit approval captured mid-pose checking angles natural lighting from closet window casual confident comfortable showing off energy authentic fashion moment">👖 Closet Try-On</option>
                                <option value="Perched on bathroom counter edge legs dangling sink woman leans back on palms casual confident pose wearing boyfriend's white dress shirt unbuttoned halfway showing black lace bralette underneath shirt sleeves rolled to elbows hem falls mid-thigh bare legs smooth messy morning hair tousled natural morning-after glow makeup smudged slightly from sleep toothbrush in holder behind scattered skincare intimate stolen-shirt morning moment girlfriend borrowed clothes aesthetic captured from doorway perspective watching her sit on counter eating toast playful comfortable domestic intimacy radiates">🪥 Counter Perch Morning</option>
                                <option value="Lying on stomach reading book propped on elbows bed woman completely absorbed in novel wearing extremely short black silk sleep shorts riding up from position smooth tanned legs bent at knees feet swaying air playfully loose gray tank top drapes forward from gravity bedroom afternoon sunlight streams window book pages casting shadow face concentrated reading expression messy bun hair scattered pillows around comfortable reading nook aesthetic intimate girlfriend quiet reading moment captured from side angle casual peaceful domestic bliss vulnerability focus natural beauty unaware of observer">📖 Reading Stomach-Down</option>
                                <option value="Kitchen island breakfast woman sits on high stool barefoot legs crossed casual morning pose wearing oversized pink sweatshirt completely off both shoulders revealing smooth collarbones décolletage tiny white cotton panties visible beneath sweatshirt hem which barely covers lap messy morning hair loose holding coffee mug both hands steam rising morning sunlight floods modern kitchen scattered breakfast items croissant jam butter knife plate intimate cozy breakfast moment girlfriend lazy Sunday morning energy authentic domestic intimacy casual comfort radiates completely natural unposed stolen morning instant perfect vulnerability">🥐 Breakfast Stool</option>
                                <option value="Standing balcony railing overlooking city sunset golden hour woman leans forward both elbows on metal railing looking out at view wearing flowing sheer white maxi dress completely backlit by setting sun fabric so thin entire body silhouette visible through material sunset rim lighting creates glowing halo effect around edges wind catches dress fabric billows gently bare feet concrete balcony floor wine glass resting on railing beside potted plants city lights beginning twinkle below intimate private moment woman lost in thoughts peaceful contemplation beautiful vulnerable powerful energy radiates captured from behind slightly to side perfect golden hour magic">🌆 Balcony Sunset Glow</option>
                            </select>
                        </div>

                        {/* Explicit/Nude Prompts Dropdown */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#888' }}>
                                Explicit & Nude
                            </label>
                            <select
                                onChange={(e) => e.target.value && setPrompt(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'black',
                                    border: '1px solid #333',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                                defaultValue=""
                            >
                                <option value="">Select explicit prompt...</option>
                                <option value="Kneeling on unmade king bed facing camera, completely nude, bare skin glowing, soft morning sunlight through floor-to-ceiling windows, hands on thighs, palms up, full frontal nudity, smooth breasts, erect pink nipples, flat toned stomach, hip bones defined, soft inner thigh gap, pussy visible, smooth waxed vulva, messy blonde bedhead hair">💎 Kneeling Bed Nude</option>
                                <option value="Standing full-length bedroom mirror selfie, holding iPhone chest height, completely naked, three-quarter angle, breast visible round shape, nipple pointing forward, smooth bare stomach, flat toned abs, belly button, hip curve, bare pussy, smooth waxed skin, inner thigh gap, messy hair loose natural">🪞 Naked Mirror Selfie</option>
                                <option value="Lying on back across bed diagonal, straight overhead stretch, arching back, breasts point upward, nipples erect, smooth skin glowing, window light, bare pussy visible between thighs, smooth waxed vulva, white cotton sheets tangled, messy blonde hair spread on pillow">🌅 Naked Morning Stretch</option>
                                <option value="Standing under rainfall showerhead behind steamed glass door, hot water cascading, completely naked, wet skin glistening, water droplets on breasts and nipples, flat stomach, hands in soaked hair, bare breasts wet shine, smooth waxed pussy visible through steam">🚿 Steamy Shower Nude</option>
                                <option value="Sitting on edge of infinity pool at sunrise, completely naked, bare breasts visible, nipples point forward, legs dangling in water mid-thigh, bare smooth waxed pussy partially visible, hands gripping pool edge, wet hair slicked back, water droplets on skin">🌊 Poolside Naked Dawn</option>
                                <option value="Bent over bathroom vanity washing face, completely naked, leaning forward at waist, bare round buttocks prominent, tight cheeks, smooth spray tanned skin, smooth waxed asshole visible, inner thighs gap shows pussy lips from behind, hanging bare breasts side view, nipples pointing downward">🛁 Bent Washing Face</option>
                                <option value="Lying stomach-down on bed reading phone, propped on elbows, completely naked, bare back, smooth shoulder blades, round perfect buttocks cheeks prominent, smooth spray-tanned skin, small back dimples, legs bent at knees, feet crossed in air, bare ass, inner butt curve visible, smooth waxed asshole hint">🍑 Naked Phone Browsing</option>
                                <option value="Squatting low picking up earring from floor, completely naked, legs spread wide, bare pussy completely visible, full frontal vulva, lips slightly spread, smooth waxed skin, pink inner lips, clit hood peek, bare breasts hang naturally, nipples pointing downward">🔍 Squatting Pick Up</option>
                                <option value="Crawling forward on hands and knees on bed, completely naked, bare breasts hanging naturally, nipples erect point downward, perfect round shape, stomach visible, back slightly arched, ass elevated behind, round buttocks cheeks spread, smooth spray-tanned skin, pussy visible from behind">🐆 Crawling Toward Camera</option>
                                <option value="Seated on floor against wall, legs spread wide V-shape, completely naked, full frontal nudity, bare breasts, nipples point forward, smooth flat stomach, pussy completely on display, smooth waxed vulva, lips slightly parted, pink inner lips visible, clit hood peek, hands on floor">📐 Spread Floor Sitting</option>
                                <option value="Standing touching toes yoga stretch, completely naked, bare round buttocks elevated, tight athletic cheeks, smooth spray-tanned skin, spread slightly, smooth waxed asshole visible, pussy lips visible from behind, vulva full smooth between inner thighs, bare back straight">🧘 Naked Toe Touch</option>
                                <option value="Reclining in bathtub submerged to collarbone, completely naked underwater, bare breasts float naturally, nipples visible through clear water, one leg raised bent knee on tub edge, smooth bare pussy visible on raised leg, vulva lips smooth waxed glistening wet">🛁 Nude Bath Leg Up</option>
                                <option value="Standing tippy-toes reaching high closet shelf, back fully arched, completely naked, bare round buttocks, tight athletic cheeks, smooth spray-tanned, smooth waxed asshole hint, pussy lips visible from behind between inner thighs, one arm overhead, side profile visible">👗 Naked Closet Reach</option>
                                <option value="Lying on side on bed facing camera, head propped on hand, completely naked, top leg bent knee raised, opening hips, bare pussy completely visible, smooth waxed vulva, lips full pink inner lips, clit hood peek, bottom leg straight, top bare breast, nipple erect">💋 Side Lying Display</option>
                                <option value="Sitting cross-legged on floor with laptop, completely naked, bare breasts visible, nipples soft, smooth legs crossed, pussy hidden by position, focused expression, messy bun, natural no-makeup face, afternoon sunlight">💻 Naked Laptop Work</option>
                                <option value="On hands and knees cleaning up clothes from floor, completely naked, bare round buttocks elevated, tight athletic ass cheeks, smooth spray-tanned skin, spread slightly, smooth waxed asshole visible, pussy lips visible from behind, hanging bare breasts side view">🧹 Naked Floor Cleanup</option>
                                <option value="Straddling chair backward, arms crossed on chair back, completely naked facing camera, bare breasts rest on forearms, nipples slightly visible, smooth flat stomach, legs spread, bare pussy pressed against chair, visible vulva lips spread slightly">🪑 Naked Chair Straddle</option>
                                <option value="Doing yoga bridge pose on floor, arching back, completely naked, hips thrust upward, bare chest thrust forward, breasts point toward face, nipples point backward, smooth flat stomach, bare pussy elevated on display, smooth waxed vulva lips visible">🤸 Naked Bridge Arch</option>
                                <option value="Climbing out of pool ladder, water streaming down body, completely naked, wet skin glistening, bare breasts hang naturally, water drips from nipples, smooth waxed pussy visible between thighs, hands grip chrome rails, head tilted back">🏊 Pool Ladder Emerge</option>
                                <option value="Lying face-down on massage table, completely naked, bare back, smooth shoulder blades, round buttocks cheeks, smooth spray-tanned curves, legs slightly spread, bare pussy hint visible between inner thighs from behind, arms folded under head">💆 Naked Massage Table</option>
                                <option value="Sitting on edge of bathtub, legs hanging over side, completely naked dripping wet, bare breasts wet shine, water droplets, smooth stomach, bare pussy visible between slightly parted thighs, smooth waxed vulva glistening wet, hands grip tub edge">🛁 Bathtub Edge Sitting</option>
                                <option value="Lying on bed leg raised vertical stretching hamstring, completely naked, holding ankle, bare pussy completely visible between spread legs, smooth waxed vulva lips full slightly parted, pink inner lips, other leg flat, bare breasts rest naturally, nipples point upward">🦵 Vertical Leg Stretch</option>
                                <option value="Standing at floor-to-ceiling window back to camera, completely nude, bare smooth back, round perfect buttocks cheeks, tight athletic, smooth spray-tanned, bare legs straight, morning cityscape background, silhouette rim lighting">🌇 Window Naked Silhouette</option>
                                <option value="Bending over picking up towel, completely naked, bent at waist ninety degrees, bare round buttocks elevated, tight athletic ass cheeks, smooth spray-tanned skin, spread wide, smooth waxed asshole completely visible, pussy lips hanging down visible from behind">🧺 Naked Towel Pickup</option>
                            </select>
                        </div>
                    </div>



                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder={`Describe the image you want to generate...${appearance ? `\n\nBase appearance: ${appearance}` : ''}`}
                        rows={6}
                        disabled={progressState.status !== 'idle' && !isProcessingRef.current}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'black',
                            border: `1px solid ${isProcessingRef.current && progressState.status === 'idle' ? '#fff' : '#333'}`,
                            color: 'white',
                            borderRadius: '8px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            opacity: (progressState.status !== 'idle' && !isProcessingRef.current) ? 0.5 : 1
                        }}
                    />
                    {appearance && (
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                            Your character's appearance will be automatically prepended
                        </p>
                    )}
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: '500' }}>
                        Tip: Keep clicking "Generate" to queue multiple prompts. Your prompt will clear after each add!
                    </p>
                </div>




                {/* Aspect Ratio Selector */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                        Aspect Ratio
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { label: '1:1', value: '1:1' },
                            { label: '16:9', value: '16:9' },
                            { label: '9:16', value: '9:16' },
                            { label: '4:3', value: '4:3' },
                            { label: '3:4', value: '3:4' },
                            { label: '3:2 (H)', value: '3:2' },
                            { label: '2:3 (V)', value: '2:3' }
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setAspectRatio(option.value)}
                                style={{
                                    flex: '1 0 14%',
                                    padding: '8px 4px',
                                    background: aspectRatio === option.value ? '#0070f3' : '#1a1a1a',
                                    border: `1px solid ${aspectRatio === option.value ? '#0070f3' : '#333'}`,
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: aspectRatio === option.value ? '600' : 'normal',
                                    boxShadow: aspectRatio === option.value ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Number of Images */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                        Number of Images
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={numImages}
                        onChange={e => setNumImages(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        disabled={progressState.status !== 'idle'}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'black',
                            border: '1px solid #333',
                            color: 'white',
                            borderRadius: '8px'
                        }}
                    />
                </div>

                {/* Progress Indicator */}
                {progressState.status !== 'idle' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                                {progressState.message}
                            </span>
                            <span style={{ fontSize: '12px', color: '#888' }}>
                                {Math.round(progressState.progress)}%
                            </span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#222',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid #333'
                        }}>
                            <div style={{
                                width: `${progressState.progress}%`,
                                height: '100%',
                                background: '#fff',
                                transition: 'width 0.3s ease',
                                boxShadow: 'none'
                            }} />
                        </div>
                    </div>
                )}


                {/* Aspect Ratio Selector */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#ccc', fontWeight: '600' }}>
                        Aspect Ratio
                    </label>
                    <select
                        value={aspectRatio}
                        onChange={e => setAspectRatio(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'black',
                            border: '1px solid #333',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="1:1">1:1 Square (Instagram)</option>
                        <option value="16:9">16:9 Landscape (YouTube)</option>
                        <option value="5:4">5:4 Portrait</option>
                        <option value="4:3">4:3 Classic</option>
                        <option value="3:2">3:2 Photography</option>
                        <option value="2.39:1">2.39:1 Cinematic Wide</option>
                        <option value="21:9">21:9 Ultra Wide</option>
                        <option value="18:9">18:9 Tall (Modern Phone)</option>
                        <option value="17:9">17:9 Tall</option>
                        <option value="1.85:1">1.85:1 Widescreen</option>
                    </select>
                </div>

                {/* Single Smart Generate Button */}
                <button
                    onClick={() => {
                        if (isProcessingRef.current || progressState.status !== 'idle') {
                            // Add to queue if already processing
                            addToQueue();
                        } else {
                            // Generate immediately if idle
                            addToQueue(); // Always use queue for consistency
                        }
                    }}
                    disabled={!loraPath}
                    style={{
                        padding: '16px 24px',
                        background: !loraPath ? '#444' : '#fff',
                        color: !loraPath ? '#666' : '#000',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: !loraPath ? 'not-allowed' : 'pointer',
                        fontWeight: '700',
                        fontSize: '16px',
                        opacity: !loraPath ? 0.6 : 1,
                        transition: 'all 0.2s',
                        width: '100%'
                    }}
                >
                    {isProcessingRef.current && queue.length > 0
                        ? `Add to Queue (${queue.length} in queue)`
                        : 'Generate Images'}
                </button>

                {!loraPath && (
                    <p style={{ fontSize: '12px', color: '#f87171', textAlign: 'center' }}>
                        Please configure a LoRA in Settings first
                    </p>
                )}

                {/* Queue Panel */}
                {queue.length > 0 && (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        marginTop: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                                Generation Queue ({queue.length} {queue.length === 1 ? 'item' : 'items'})
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {isProcessingRef.current && (
                                    <button
                                        onClick={cancelQueue}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#333',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm('Clear entire queue?')) {
                                            setQueue([]);
                                        }
                                    }}
                                    disabled={isProcessingRef.current}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'transparent',
                                        color: '#666',
                                        border: '1px solid #333',
                                        borderRadius: '6px',
                                        cursor: isProcessingRef.current ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        opacity: isProcessingRef.current ? 0.5 : 1
                                    }}
                                >
                                    Clear Queue
                                </button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {queue.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{
                                        padding: '12px',
                                        background: idx === 0 && isProcessingRef.current ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.3)',
                                        border: `1px solid ${idx === 0 && isProcessingRef.current ? '#fff' : '#333'}`,
                                        borderRadius: '8px',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: idx === 0 && isProcessingRef.current ? '#fff' : '#fff',
                                                    background: idx === 0 && isProcessingRef.current ? '#333' : 'rgba(255, 255, 255, 0.1)',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {idx === 0 && isProcessingRef.current ? 'PROCESSING' : `#${idx + 1}`}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#888' }}>
                                                    {item.numImages} {item.numImages === 1 ? 'image' : 'images'} • {item.aspectRatio}
                                                </span>
                                            </div>
                                            <p style={{
                                                fontSize: '12px',
                                                color: '#ccc',
                                                lineHeight: '1.4',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            } as any}>
                                                {item.prompt}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (idx === 0 && isProcessingRef.current) {
                                                    alert('Cannot remove item that is currently processing');
                                                    return;
                                                }
                                                setQueue(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                            disabled={idx === 0 && isProcessingRef.current}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'transparent',
                                                color: (idx === 0 && isProcessingRef.current) ? '#444' : '#ef4444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: (idx === 0 && isProcessingRef.current) ? 'not-allowed' : 'pointer',
                                                fontSize: '16px',
                                                opacity: (idx === 0 && isProcessingRef.current) ? 0.3 : 1,
                                                transition: 'opacity 0.2s'
                                            }}
                                            title={(idx === 0 && isProcessingRef.current) ? 'Cannot remove' : 'Remove from queue'}
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isProcessingRef.current && (
                            <div style={{
                                marginTop: '12px',
                                padding: '10px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#fff',
                                fontWeight: '600'
                            }}>
                                Processing queue... Item 1 of {queue.length}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Panel - Generated Images */}
            <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                overflowY: 'auto',
                maxHeight: '700px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Generated Images ({generatedImages.length})
                </h3>

                {generatedImages.length === 0 ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: '#666',
                        border: '2px dashed #333',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.2 }}>[]</div>
                        <p>Your generated images will appear here</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {generatedImages.map((imageUrl, idx) => (
                            <div
                                key={idx}
                                style={{
                                    position: 'relative',
                                    background: '#111',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid #333'
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imageUrl}
                                    alt={`Generated ${idx + 1}`}
                                    style={{
                                        width: '100%',
                                        display: 'block',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setPreviewImage(imageUrl)}
                                />
                                <div style={{
                                    padding: '12px',
                                    display: 'flex',
                                    gap: '8px',
                                    background: 'rgba(0,0,0,0.8)'
                                }}>
                                    <button
                                        onClick={() => handleSaveToLibrary(imageUrl)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: '#333',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => handlePostToFanvue(imageUrl)}
                                        disabled={isPosting === imageUrl}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#333',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: isPosting === imageUrl ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            opacity: isPosting === imageUrl ? 0.7 : 1
                                        }}
                                    >
                                        {isPosting === imageUrl ? 'Posting...' : 'Post'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Navigate to workflow chain with this image
                                            window.location.href = '/tools/workflow-chain?addImage=' + encodeURIComponent(imageUrl);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#333',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Chain
                                    </button>

                                    <a
                                        href={imageUrl}
                                        download
                                        style={{
                                            padding: '8px 12px',
                                            background: '#333',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div
                        onClick={() => setPreviewImage(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'rgba(0,0,0,0.95)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )
            }
        </div >
    );
}
