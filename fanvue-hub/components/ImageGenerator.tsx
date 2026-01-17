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
    const [age, setAge] = useState(22);
    const [breastSize, setBreastSize] = useState(3); // 1=flat, 2=petite, 3=modest, 4=medium, 5=full, 6=D-cup
    const [height, setHeight] = useState(3); // 1=very petite, 2=petite, 3=average, 4=tall, 5=very tall
    const [bodyType, setBodyType] = useState('athletic'); // slim, athletic, curvy, thick
    const [skinTone, setSkinTone] = useState('fair'); // pale, fair, tan, olive, brown, deep
    const [hairColor, setHairColor] = useState('blonde'); // blonde, brunette, black, red, auburn
    const [hairLength, setHairLength] = useState(3); // 1=pixie, 2=short, 3=shoulder, 4=long, 5=very long

    // Queue system
    interface QueueItem {
        id: string;
        prompt: string;
        fullPrompt: string; // The complete prompt with appearance modifiers
        numImages: number;
        aspectRatio: string;
        age: number;
        breastSize: number;
        height: number;
        bodyType: string;
        skinTone: string;
        hairColor: string;
        hairLength: number;
    }
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const isProcessingRef = useRef(false);

    // Generate appearance description from sliders
    const getAppearanceFromSliders = () => {
        const parts = [];

        // Age
        parts.push(`${age} years old`);

        // Breast size
        const breastSizes = {
            1: 'completely flat chest athletic tomboy physique',
            2: 'petite perky A-cup breasts small delicate',
            3: 'modest natural B-cup breasts perfect proportions',
            4: 'medium shapely C-cup breasts feminine curves',
            5: 'full voluptuous breasts ample cleavage',
            6: 'large D-cup breasts generous bustline'
        };
        parts.push(breastSizes[breastSize as keyof typeof breastSizes]);

        // Height
        const heights = {
            1: '150cm very petite small frame delicate',
            2: '160cm petite slender build',
            3: '168cm average height well-proportioned',
            4: '175cm tall statuesque leggy',
            5: '180cm very tall model height long legs'
        };
        parts.push(heights[height as keyof typeof heights]);

        // Body type
        const bodyTypes = {
            slim: 'slim slender lean physique toned',
            athletic: 'athletic fit toned defined muscles gym body',
            curvy: 'curvy hourglass figure feminine soft curves',
            thick: 'thick voluptuous plush body thicc'
        };
        parts.push(bodyTypes[bodyType as keyof typeof bodyTypes]);

        // Skin tone
        const skinTones = {
            pale: 'porcelain pale skin ivory complexion',
            fair: 'fair skin natural light complexion',
            tan: 'sun-kissed tan skin golden glow',
            olive: 'olive skin Mediterranean complexion',
            brown: 'brown skin rich caramel tone',
            deep: 'deep dark skin ebony complexion'
        };
        parts.push(skinTones[skinTone as keyof typeof skinTones]);

        // Hair color
        const hairColors = {
            blonde: 'blonde hair golden locks',
            brunette: 'brunette hair chestnut brown',
            black: 'black hair raven dark',
            red: 'red hair fiery ginger',
            auburn: 'auburn hair copper highlights'
        };
        parts.push(hairColors[hairColor as keyof typeof hairColors]);

        // Hair length
        const hairLengths = {
            1: 'pixie cut short cropped hair',
            2: 'short hair chin-length bob',
            3: 'shoulder-length hair medium',
            4: 'long hair flowing past shoulders',
            5: 'very long hair waist-length cascading'
        };
        parts.push(hairLengths[hairLength as keyof typeof hairLengths]);

        return parts.join(' ');
    };

    const { state: progressState, startMonitoring, reset: resetProgress } = useComfyProgress();

    // Add current settings to queue
    const addToQueue = () => {
        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        const fullPromptText = `${getAppearanceFromSliders()}, ${appearance ? appearance + ', ' : ''}${prompt.trim()}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`;

        const newItem: QueueItem = {
            id: Date.now().toString() + Math.random(),
            prompt: prompt.trim(),
            fullPrompt: fullPromptText,
            numImages,
            aspectRatio,
            age,
            breastSize,
            height,
            bodyType,
            skinTone,
            hairColor,
            hairLength
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
                    prompt: `${getAppearanceFromSlidersForItem(item)}, ${appearance ? appearance + ', ' : ''}${item.prompt}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`,
                    negativePrompt: `ugly, deformed, blurry, low quality, no plastic skin, no beauty filters, no over-smooth retouching, no deformed face, no bad anatomy, no extra fingers, no asymmetrical eyes, no cross-eyed gaze, no watermark, no text, no logo, no low-res, no blur`,
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

    // Helper to get appearance from queue item
    const getAppearanceFromSlidersForItem = (item: QueueItem) => {
        const parts = [];
        parts.push(`${item.age} years old`);

        const breastSizes = {
            1: 'completely flat chest athletic tomboy physique',
            2: 'petite perky A-cup breasts small delicate',
            3: 'modest natural B-cup breasts perfect proportions',
            4: 'medium shapely C-cup breasts feminine curves',
            5: 'full voluptuous breasts ample cleavage',
            6: 'large D-cup breasts generous bustline'
        };
        parts.push(breastSizes[item.breastSize as keyof typeof breastSizes]);

        const heights = {
            1: '150cm very petite small frame delicate',
            2: '160cm petite slender build',
            3: '168cm average height well-proportioned',
            4: '175cm tall statuesque leggy',
            5: '180cm very tall model height long legs'
        };
        parts.push(heights[item.height as keyof typeof heights]);

        const bodyTypes = {
            slim: 'slim slender lean physique toned',
            athletic: 'athletic fit toned defined muscles gym body',
            curvy: 'curvy hourglass figure feminine soft curves',
            thick: 'thick voluptuous plush body thicc'
        };
        parts.push(bodyTypes[item.bodyType as keyof typeof bodyTypes]);

        const skinTones = {
            pale: 'porcelain pale skin ivory complexion',
            fair: 'fair skin natural light complexion',
            tan: 'sun-kissed tan skin golden glow',
            olive: 'olive skin Mediterranean complexion',
            brown: 'brown skin rich caramel tone',
            deep: 'deep dark skin ebony complexion'
        };
        parts.push(skinTones[item.skinTone as keyof typeof skinTones]);

        const hairColors = {
            blonde: 'blonde hair golden locks',
            brunette: 'brunette hair chestnut brown',
            black: 'black hair raven dark',
            red: 'red hair fiery ginger',
            auburn: 'auburn hair copper highlights'
        };
        parts.push(hairColors[item.hairColor as keyof typeof hairColors]);

        const hairLengths = {
            1: 'pixie cut short cropped hair',
            2: 'short hair chin-length bob',
            3: 'shoulder-length hair medium',
            4: 'long hair flowing past shoulders',
            5: 'very long hair waist-length cascading'
        };
        parts.push(hairLengths[item.hairLength as keyof typeof hairLengths]);

        return parts.join(' ');
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
                    prompt: `${getAppearanceFromSliders()}, ${appearance ? appearance + ', ' : ''}${prompt}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`,
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
            const fullPromptText = `${getAppearanceFromSliders()}, ${appearance ? appearance + ', ' : ''}${prompt}, hyper-realistic 8K portrait, natural skin texture with visible pores and fine micro-details, subtle peach-fuzz, realistic subsurface scattering, professional studio lighting, shallow depth of field, razor-sharp eyes, anatomically correct face and body, cinematic editorial photography`;
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

                if (data.status === 'done' && data.images && data.images.length > 0) {
                    // Save images with prompt metadata
                    const newImagesData: GeneratedImageData[] = data.images.map((url: string) => ({
                        url,
                        prompt: fullPrompt,
                        timestamp: Date.now()
                    }));
                    setGeneratedImagesData(prev => [...newImagesData, ...prev]);
                    setGeneratedImages(prev => [...data.images, ...prev]);
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
                                🌟 Lifestyle & Casual
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
                                <option value="Young woman stands barefoot on cool bathroom tiles holding her iPhone in her right hand at chest height capturing her reflection in the slightly steamed-up mirror above the sink wearing an oversized vintage band t-shirt pale gray color that's three sizes too big slipping casually off her left shoulder revealing smooth collarbone and delicate freckles across her chest left hand rests lightly on the sink edge for balance messy blonde hair still tousled from sleep with natural beach waves framing her face tilts her head 15 degrees to the right biting her lower lip gently with a sleepy yet flirty half-smile morning light streams through frosted window behind her creating perfect backlighting that catches tiny steam particles floating in air counter cluttered with skincare products toothbrush electric toothbrush head makeup brush morning routine authenticity bathroom walls soft mint green scuffed white floor tiles slightly dirty bathmat crumpled towel hanging rack perfect unposed influencer morning moment captured exactly right before she brushes teeth">🪞 Morning Mirror</option>
                                <option value="Fresh from swimming laps girl sits on rough concrete pool edge legs dangling in cool blue water wearing simple white triangle bikini top tied behind neck back perfect tan lines visible shoulders water droplets slowly roll down collarbone between breasts onto stomach sparkling sunlight she pushes wet dark hair back both hands laughing genuine joy head thrown slightly back exposing neck jewelry friend snaps candid iPhone photo from poolside golden sunlight creates perfect rim lighting around silhouette palm tree shadows dance across concrete deck behind her faded striped pool towel folded nearby empty plastic water bottle condensation dripping lounge chair umbrella casting shade colorful striped towel perfect tropical vacation friendship moment captured mid-laugh chlorine smell sunscreen scent palpable">🌊 Poolside Swim</option>
                                <option value="Striding confidently down busy downtown sidewalk woman AirPods Pro wireless earbuds both ears laughing animatedly phone conversation wearing cropped black leather jacket unzipped just enough show white lace bralette straps underneath high-waisted dark wash mom jeans hugging curves late afternoon golden hour light hits face perfectly casting long shadow across wet pavement ahead neon coffee shop signs reflect puddles she passes street vendor hot dog cart parked cars double-parked glance briefly camera mid-stride stride purposeful casual stride turns head slightly catch friend's eye perfect urban working girl caught living moment city pulse palpable">🏙️ City Phone Call</option>
                                <option value="Sitting cross-legged unmade queen bed covered tangled white sheets duvet half fallen floor young woman stretches arms overhead genuine yawn sleepy smile exposes perfect teeth oversized boyfriend t-shirt heather gray slips dramatically off right shoulder revealing smooth shoulder blade mole freckles across upper chest holding steaming ceramic coffee mug both hands white stoneware steam rising curls around face morning sunlight filters through sheer white curtains creating perfect softbox effect dust motes dance sunbeams hardwood floor scattered with yesterday's clothes sneakers one sock crumpled rug perfect cozy authentic bedroom morning routine moment captured mid-stretch right before first sip coffee">😴 Bedroom Stretch</option>
                                <option value="Perfectly positioned café window seat woman leans chin left hand gazing thoughtfully street outside sipping iced coffee caramel-colored condensation drips tall glass straw between glossy lips wearing cream cable-knit sweater oversized showing delicate collarbones thin gold necklace 14k chain tiny diamond pendant catches perfect light laptop open screen glows illuminates focused face colorful pastries croissant flakes plate beside scattered laptop stickers morning work-from-anywhere aesthetic pedestrians blur past window bokeh effect street signs bikes parked perfect creative morning moment captured mid-thought">☕ Café Window</option>
                                <option value="Leaning halfway out passenger window speeding 75mph highway golden hour woman hair wildly blowing every direction aviator sunglasses pushed up forehead strands stick sweaty forehead black leather jacket unzipped halfway white lace bralette visible underneath arms crossed casually on door frame dashboard glows orange sunset highway streaks motion blur background empty Starbucks cup rolling floor perfect road trip spontaneous friendship moment mouth open mid-laugh teeth perfect freedom joy palpable wind noise deafening">🚗 Road Trip Wind</option>
                                <option value="High-angle shot gym rubberized floor woman sits cross-legged blue Nalgene water bottle tilted mouth sweat beads forehead drips collarbone cropped neon green sports bra perfect tan lines high-waist black biker shorts rolled once genuine tired-happy smile looking camera hair messy sweat-soaked ponytail pieces stick neck gym equipment racks mirrors reflect background other gym-goers blurred motion water bottle condensation drips thigh authentic fitness journey moment captured mid-hydration breath ragged perfect unfiltered post-workout reality">💪 Gym Water Break</option>
                                <option value="Perched bare feet dangling kitchen marble countertop woman swings legs playfully holding oversized ceramic coffee mug forest green both hands steam rises curls around face tiny spaghetti strap white tank top slips slightly both shoulders exposing smooth skin morning sleepy sexy smile natural no-makeup glow perfect skin texture visible pores messy brunette hair claw clip half-falling out marble counters gleaming sunlit white cabinets open baguette plate scattered avocado toast crumbs perfect morning routine domestic bliss moment captured mid-sip right counter sits toaster knife smeared avocado">🥑 Kitchen Counter</option>
                                <option value="Tight mirrored elevator woman 30 seconds big meeting quickly checks appearance tailored black blazer unbuttoned two buttons revealing cream lace camisole pencil skirt high slit red matte lip power pose gold hoop earrings catch elevator light reflection shows slight nerves mixed determination perfect working woman moment microbladed brows perfect winged eyeliner elevator buttons illuminate floor numbers ding sounds arrival perfect poised professional moment captured breath held">💼 Elevator Power</option>
                                <option value="Park wooden bench surrounded vibrant fallen orange yellow leaves woman curled fetal position chunky oatmeal knit sweater rust-colored scarf wrapped twice reading dog-eared paperback romance novel open lap autumn golden hour sunlight filters bare tree branches hair catches soft breeze few strands cross eyes soft peaceful expression completely absorbed story cozy fall moment captured mid-page turn crisp air leaf crunch palpable perfect seasonal friendship candid">🍂 Park Reading</option>
                                <option value="Rooftop ledge 20th floor golden hour woman flowy bias-cut satin slip dress ivory color wind dramatically catches fabric billows around legs hair wildly tousled perfect mess peaceful horizon gaze twinkling city skyline glows orange pink purple perfect rim lighting contours face shoulders collarbones high-fashion editorial portrait natural perfect skin golden light creates perfect god rays between skyscrapers serene influencer moment captured mid-breath wind whipping perfect cinematic perfection">🌆 Rooftop Sunset</option>
                                <option value="Leaning cluttered IKEA desk studying woman pushes black-rimmed glasses up nose tired determination smile micro expression shows focus messy claw clip holds chestnut hair back loose strands frame face cropped sage green sweater shows toned forearms scattered textbooks highlighters sticky notes laptop screen glows Discord open professor email inbox overflowing late night student life perfect grit moment captured mid-equation solve">📚 Late Night Study</option>
                                <option value="Fresh ocean waves petite woman sits colorful Mexican beach towel loosely wrapped around hips water still dripping hair shoulders simple triangle bikini top perfect tan lines visible finger-combing wet dark hair natural laugh squeezing excess water ocean waves crash white foam behind golden sand footprints lead water scattered seashells perfect beach candid friendship moment sunscreen scent salt air palpable perfect tropical escape">🏖️ Beach Towel</option>
                                <option value="Descending sweeping marble staircase woman holds polished wood railing confident purposeful stride flowy silk charcoal skirt cropped fitted cream blouse hair bounces perfectly each step golden hoop earrings sway catch dramatic overhead lighting shadows play marble steps high-fashion runway moment captured mid-stride poised perfection">👠 Staircase Descend</option>
                                <option value="Curled living room gray velvet sofa woman reads iPad propped pillows wearing ivory cashmere sweater thigh-high fuzzy socks cozy weekend pose afternoon sunlight filters sheer linen curtains soft shadows across face peaceful content expression perfect lazy Sunday aesthetic scattered throw pillows knit blanket half-fallen floor">🛋️ Sofa Weekend</option>
                                <option value="Urban street corner Friday night woman laughs covering mouth hand caught completely off guard perfect candid moment black leather jacket ripped black mom jeans chunky black combat boots neon bar signs reflect wet pavement spontaneous friendship photo perfect urban nightlife vibe pure joy infectious">🌃 Street Laugh</option>
                                <option value="Bathroom double sink woman morning skincare routine silk kimono robe dusty rose slips both shoulders exposing smooth upper back messy claw clip holds hair natural morning glow skincare products elegantly arranged marble counter mirror reflection shows perfect routine morning prep authentic influencer content captured mid-serum application">🧴 Skincare Ritual</option>
                                <option value="Music festival third night woman sits friendship circle glitter strategically dusted shoulders collarbones iridescent holographic crop top olive green cargo skirt black platform combat boots temporary metallic star tattoos sparkle excited festival energy colorful beaded wristbands glow sticks litter ground perfect festival candid electric atmosphere palpable">🎪 Festival Energy</option>
                                <option value="Highway 70mph golden hour woman takes selfie left hand wireless earbuds right hand iPhone perfect angle tousled caramel hair aviators perched perfect nose cropped black leather jacket white ribbed tank dashboard glows orange perfect road trip adventure aesthetic candid spontaneous moment pure freedom">🌅 Driving Sunset</option>
                                <option value="Café window perfect seat woman captured street photographer sunlight glows perfectly through glass iced latte condensation drips tall glass reading glasses perched nose chunky cream sweater collarbones peek laptop open scattered colorful pastries pedestrians perfectly blur street background morning work aesthetic pure creative magic">☕ Café Creative</option>
                                <option value="Lying stomach-down bed woman scrolls TikTok oversized heather gray t-shirt rides slightly bare legs crossed air late night bedroom glow iPhone screen perfectly illuminates face casual relaxed position perfect bedtime scroll moment tangled white sheets glow-in-dark star stickers ceiling perfect unfiltered bedtime ritual">📱 Phone Scroll</option>
                                <option value="Childhood park metal swing woman gently swings forward hair catches perfect breeze flowy cream sundress golden hour park trees perfectly blur background peaceful content expression grown-up childhood moment captured mid-swing pure nostalgic joy perfect friendship candid">🌳 Park Swing</option>
                                <option value="Kitchen island spontaneous dance woman holds wooden spoon microphone singing passionately Taylor Swift cropped black tank gray boxer shorts barefoot genuine joyful laugh messy morning hair morning music moment perfect relatable content marble counters sunlit cabinets perfect domestic bliss captured mid-chorus">🎵 Kitchen Dance</option>
                                <option value="Balcony wrought-iron railing morning coffee woman leans forward oversized ivory sweater steaming white stoneware mug both hands city waking below soft morning haze distant traffic hum hair messy natural peaceful start day moment perfect urban morning aesthetic perfect influencer serenity captured mid-breath steam rises perfect">🌇 Balcony Coffee</option>
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
                                <option value="Kneeling center unmade king bed facing camera completely naked entirely nude bare skin glowing soft morning sunlight streams floor-to-ceiling windows behind woman sits back on heels knees spread shoulder-width apart hands rest on thighs palms up vulnerable open confident pose full frontal nudity visible smooth bare breasts natural hang perfect proportions pink nipples erect from cool morning air flat toned stomach visible hip bones defined thighs soft inner thigh gap pussy completely visible smooth waxed bare vulva lips slightly parted morning light catches every curve shadow definition between legs messy blonde bedhead hair cascades shoulders frames face direct eye contact camera sultry confident expression slight smile knows exactly how beautiful she looks white cotton sheets tangled around scattered pillows hardwood floor visible luxury bedroom intimate private moment pure vulnerability confidence radiates girlfriend morning naked confidence">💎 Kneeling Bed Nude</option>
                                <option value="Standing full-length bedroom mirror completely naked taking mirror selfie iPhone held chest height woman views own reflection admiring body turning slightly three-quarter angle showing curves side profile breast visible round shape nipple pointing forward smooth bare stomach flat toned abs visible belly button hip curve sweeps down to completely bare pussy smooth waxed skin vulva visible from angle inner thigh gap one leg slightly bent knee casual confident model pose other hand rests on hip natural casual nude mirror moment messy hair loose natural no makeup fresh faced beauty bedroom visible background reflection clothes scattered floor intimate personal nude selfie moment girlfriend confident body appreciation checking herself out completely comfortable own skin perfect lighting catches every curve definition shadows enhance muscle tone athletic physique captured exactly right angle">🪞 Naked Mirror Selfie</option>
                                <option value="Lying on back across bed diagonal completely naked arms stretched overhead arching back naturally breasts point upward nipples erect perfect round shape smooth skin glowing natural window light woman stretches genuine morning yawn eyes closed peaceful sleepy smile legs slightly apart bent at knees feet flat on mattress completely bare pussy visible between thighs smooth waxed vulva lips full morning light streams across body highlighting every curve casting soft shadows under breasts along ribcage defining hip bones white cotton sheets tangled around waist bunched beside scattered pillows messy blonde hair spread across pillow intimate genuine waking moment completely nude natural unposed authentic naked morning stretch girlfriend waking up lazy Sunday morning pure vulnerability peaceful beauty captured mid-yawn right before she opens eyes sees camera">🌅 Naked Morning Stretch</option>
                                <option value="Shower glass door steamed woman stands under rainfall showerhead hot water cascades down body completely naked wet skin glistening water droplets roll down breasts over nipples down flat stomach between legs hands run through soaked hair slicking back from face eyes closed peaceful expression enjoying hot water massage bare breasts wet shine water streams between cleavage over smooth waxed pussy visible through steam glass door reflection shows side profile hip curve round buttocks cheeks wet modern marble shower luxury bathroom steam fills air intimate private shower moment girlfriend bathing unaware captured authentic vulnerability washing hair completely naked natural beauty water enhances every curve muscle definition athletic body perfect proportions captured through steamy glass artistic intimate">🚿 Steamy Shower Nude</option>
                                <option value="Sitting edge outdoor infinity pool complete silence sunrise water perfectly still reflecting pink sky completely naked bare breasts visible natural hang nipples point forward from cool morning air legs dangle in crystal clear water to mid-thigh bare smooth waxed pussy partially visible angle between thighs hands grip pool edge beside hips leaning back slightly pushing chest forward confident peaceful expression gazing at sunrise horizon glow wet hair slicked back from recent swim water droplets glisten on skin catching first light exotic hardwood pool deck luxury villa background palm trees silhouette against pink orange sky intimate vacation morning moment skinny dipping sunrise complete freedom vulnerability stunning natural beauty naked confident woman alone with nature perfect paradise instant">🌊 Poolside Naked Dawn</option>
                                <option value="Bent over bathroom vanity washing face completely naked leaning forward at waist bare round buttocks prominently displayed toward camera perfect athletic tight cheeks smooth spray tanned skin between buttocks completely visible smooth waxed asshole hint visible from bent position inner thighs gap shows pussy lips from behind angle hanging bare breasts visible from side droop naturally from gravity nipples pointing downward hands cupped under running faucet water splashing face looking down at sink messy morning hair falls forward bathroom mirror shows reflection concentrated expression washing routine natural morning light from window intimate private bathroom moment girlfriend getting ready completely comfortable being naked casual domestic nudity authentic unposed captured from behind doorway angle watching her morning routine vulnerable beautiful">🛁 Bent Washing Face</option>
                                <option value="Lying stomach-down bed reading phone propped on elbows completely naked bare back smooth shoulder blades defined athletic build tapering to narrow waist round perfect buttocks cheeks prominently displayed smooth spray-tanned skin tight athletic curves small back dimples visible above glutes legs bent at knees feet crossed in air swaying playfully completely bare ass front and center innerbutt curve visible where cheeks meet thighs smooth waxed asshole hint between cheeks messy brunette hair falls to side focused on phone screen scrolling casual relaxed bedroom afternoon sunlight streams across naked body laptop open beside showing Netflix book spine-broken beside perfect lazy naked afternoon moment girlfriend lounging completely nude comfortable own skin captured from foot of bed angle perfect ass view intimate domestic nudity">🍑 Naked Phone Browsing</option>
                                <option value="Squatting down low picking up dropped earring from hardwood floor completely naked legs spread wide squat position bare pussy completely visible full frontal vulva lips slightly spread from squatting position smooth waxed skin pink inner lips hint visible clit hood peek between folds thighs spread apart knees out to sides bare breasts hang naturally from bent forward position nipples pointing downward one hand reaches floor searching other hand steadies balance against dresser focused expression looking down searching for lost item completely unaware how exposed vulnerable position displays everything messy blonde hair falls forward morning bedroom scene casual domestic nudity authentic moment girlfriend searching for jewelry completely naked natural unposed captured exactly moment she squats down perfect explicit angle shows everything">🔍 Squatting Pick Up</option>
                                <option value="On hands and knees bed crawling forward toward camera playful seductive expression completely naked bare breasts hanging naturally from gravity position nipples erect point downward perfect round shape smooth stomach visible hanging between arms back slightly arched ass elevated behind round buttocks cheeks spread slightly from crawling position smooth spray-tanned skin pussy visible from behind angle vulva lips full smooth waxed between thighs inner thigh gap frame view messy tousled sex hair cascades shoulders direct eye contact camera sultry playful look biting lower lip crawling predator-like toward viewer white cotton sheets tangled beneath hands knees bedroom sexy playful moment girlfriend teasing crawling across bed completely naked confident seductive energy radiates perfect angle captures hanging breasts and ass simultaneously">🐆 Crawling Toward Camera</option>
                                <option value="Seated floor against wall legs spread wide V-shape completely naked displaying everything full frontal nudity bare breasts rest naturally on chest nipples point forward pink erect smooth flat stomach belly button visible between spread thighs pussy completely on display smooth waxed vulva lips slightly parted pink inner lips visible clit hood peek between folds hands rest on floor beside hips palms down leaning back against wall casual confident open pose direct eye contact camera sultry knowing smile messy bedroom hair natural no-makeup beauty hardwood floor cool against bare ass bedroom wall behind afternoon sunlight streams window catches every detail intimate private moment girlfriend sitting naked floor completely open vulnerable confident showing everything perfect explicit display confidence vulnerability simultaneously">📐 Spread Floor Sitting</option>
                                <option value="Bending forward touching toes yoga stretch completely naked standing bedroom bare round buttocks elevated toward camera tight athletic cheeks smooth spray-tanned skin spread slightly from bent position smooth waxed asshole visible between cheeks pussy lips visible from behind angle vulva full smooth between inner thighs bare back straight shoulder blades defined arms reach down long legs straight knees locked hamstrings stretched fingers touch toes athletic flexibility displayed head down between legs looking back through legs upside down at camera playful smile hair hangs down toward floor morning bedroom stretch routine completely naked casual domestic nudity girlfriend morning yoga nude perfect ass display from behind captured mid-stretch athletic body beautiful curves">🧘 Naked Toe Touch</option>
                                <option value="Reclining bathtub filled clear water submerged to collarbone completely naked underwater bare breasts float naturally in water nipples visible through crystal clear surface one leg raised bent knee foot rests on tub edge elevated above waterline smooth bare pussy visible on raised leg vulva lips smooth waxed glistening wet other leg stretched along tub bottom arms rest along porcelain edges head tilted back against tub rim eyes closed peaceful relaxed expression wet hair slicked back from face rose petals float water surface around scattered candles flicker marble bathroom counter wine glass balanced tub edge intimate evening bath moment girlfriend relaxing completely nude artistic candlelit beauty water enhances curves perfect serene vulnerability">🛁 Nude Bath Leg Up</option>
                                <option value="Standing tippy-toes reaching high closet shelf back fully arched from reaching stretch completely naked bare round buttocks tight athletic cheeks smooth spray-tanned perfect curve visible from behind side angle smooth waxed asshole hint between cheeks pussy lips visible from behind between inner thighs one arm stretched overhead reaching other arm steadies against doorframe breasts lifted from raised arms nipples point forward side profile visible narrow waist athletic build messy morning hair loose natural bedroom closet scene casual domestic moment getting dressed choosing outfit completely naked comfortable being nude unaware how perfectly pose displays curves ass pussy breasts all visible from angle morning natural light authentic girlfriend getting ready captured mid-reach vulnerable beautiful athletic body">👗 Naked Closet Reach</option>
                                <option value="Lying on side bed facing camera head propped on hand elbow supporting completely naked top leg bent knee raised toward chest opening hips displaying bare pussy completely visible from front angle smooth waxed vulva lips full pink inner lips slightly visible clit hood peek between folds bottom leg stretched straight behind top bare breast rests naturally on ribcage nipple erect points forward perfect round shape smooth flat stomach visible hip curve defined waist narrow athletic messy sex hair tousled cascades pillow sultry bedroom eyes direct camera contact slight knowing smile white sheets tangled around intimate bedroom afternoon moment girlfriend posing naked confident seductive knows exactly what she showing perfect gynecological angle displays everything">💋 Side Lying Display</option>
                                <option value="Sitting cross-legged floor laptop on lap working completely naked bare breasts visible natural sit position nipples soft relaxed perfect round proportions smooth legs crossed pretzel-style pussy completely hidden by crossed legs position focused expression looking down at laptop screen typing concentrated work mode messy bun hair claw-clipped natural no-makeup face afternoon sunlight streams nearby window catches skin glow hardwood floor cool beneath bare ass scattered notebooks pens coffee mug beside working from home completely nude casual comfortable domestic nudity girlfriend productive naked laptop work moment authentic concentrated focus beautiful casual nudity captured working hard completely comfortable own naked body">💻 Naked Laptop Work</option>
                                <option value="Hands and knees floor cleaning up scattered clothes completely naked bare round buttocks elevated toward camera tight athletic ass cheeks smooth spray-tanned skin spread slightly from bent position smooth waxed asshole visible between cheeks pussy lips visible from behind angle hanging bare breasts visible from side droop naturally from gravity nipples point downward reaching hand picking up shirt from floor other hand planted floor supporting focused on cleaning task unaware how exposed vulnerable position head down looking at mess messy hair falls forward bedroom scene clothes scattered authentic domestic moment girlfriend cleaning room completely naked casual comfortable nudity captured from behind perfect explicit rear view">🧹 Naked Floor Cleanup</option>
                                <option value="Straddling chair backward arms crossed resting on chair back completely naked facing camera bare breasts rest on crossed forearms nipples slightly visible peek over arms smooth flat stomach belly button visible sitting spread-legged on chair seat bare pussy pressed against chair leather visible vulva lips spread slightly from sitting position inner thighs frame seat direct eye contact camera sultry confident expression messy bedroom hair natural beauty bedroom chair scene intimate private moment girlfriend posing naked on chair confident seductive backward straddle position shows curves breasts pussy all visible perfect confident pose">🪑 Naked Chair Straddle</option>
                                <option value="Arching back extreme yoga bridge pose completely naked bedroom floor hands feet planted floor hips thrust upward toward ceiling bare chest thrust forward breasts point toward face gravity pulls natural shape nipples point backward smooth flat stomach arched concave ribcage visible between raised arms bare pussy elevated on display smooth waxed vulva lips visible from below angle thighs spread apart supporting position athletic flexibility displayed extreme back arch yoga mat beneath bedroom scene morning yoga routine completely naked casual domestic nudity girlfriend practicing nude beautiful athletic flexibility intimate moment captured mid-pose vulnerable beautiful strong">🤸 Naked Bridge Arch</option>
                                <option value="Emerging from pool climbing ladder water streams down body completely naked wet skin glistening sunlight bare breasts hang naturally water drips from nipples down stomach smooth waxed pussy visible between thighs water cascades down legs hands grip chrome pool ladder rails pulling body up from water one foot on ladder rung other still in water head tilted back slicking wet hair from face eyes closed water droplets catch sunlight exotic pool deck luxury villa palm trees background intimate vacation moment skinny dipping emerging from swim completely nude confident beautiful water enhances every curve muscle definition perfect athletic body wet goddess emerging">🏊 Pool Ladder Emerge</option>
                                <option value="Face-down massage table completely naked bare back smooth shoulder blades visible spine depression runs down center round buttocks cheeks smooth spray-tanned perfect curves legs slightly spread bare pussy hint visible between inner thighs from behind angle arms folded under head turned to side restful peaceful expression eyes closed relaxed face hole in massage table white towel folded beneath hips massage oil bottle beside flickering candles soft lighting luxury spa setting intimate massage moment girlfriend relaxing completely nude beautiful vulnerable peaceful captured from foot of table angle perfect ass curves back definition serene beauty">💆 Naked Massage Table</option>
                                <option value="Sitting bathtub edge legs hanging over side into water completely naked dripping wet having just stood up from bath bare breasts wet shine water droplets roll down between cleavage over nipples down smooth stomach bare pussy visible between slightly parted thighs smooth waxed vulva glistening wet hands grip porcelain tub edge beside hips steadying balance water drips from body creating puddles on marble floor wet hair plastered against shoulders back bathroom steamed mirror reflection visible behind rose petals float bath water candles flicker counter intimate evening moment girlfriend mid-bath standing up completely nude wet beautiful captured transitioning from bath">🛁 Bathtub Edge Sitting</option>
                                <option value="Lying diagonal across bed one leg raised straight up vertical toe pointed toward ceiling completely naked holding raised ankle with both hands stretching hamstring bare pussy completely visible displayed between spread legs smooth waxed vulva lips full slightly parted from stretched position pink inner lips hint visible other leg stretched flat on bed bare breasts rest naturally on chest nipples point upward playful smile looking up at raised leg athletic flexibility morning bedroom stretch routine completely naked casual domestic nudity girlfriend stretching nude perfect explicit gymnastic pose displays everything beautiful athletic confident">🦵 Vertical Leg Stretch</option>
                                <option value="Standing floor-to-ceiling window naked back to camera looking out city view completely nude bare smooth back visible shoulder blades defined curving down to narrow waist round perfect buttocks cheeks tight athletic smooth spray-tanned bare legs straight posture strong confident one hand touches window glass cool against palm other hand rests on hip casual confident stance morning cityscape twenty floors below golden hour sunlight streams through window backlights naked silhouette rim lighting glows around body edges hair loose messy intimate private moment woman alone with thoughts naked powerful vulnerable beautiful contemplating sunrise perfect artistic nude silhouette vulnerability strength simultaneously radiate">🌇 Window Naked Silhouette</option>
                                <option value="Bending over picking up towel from floor bedroom completely naked bent at waist ninety degrees bare round buttocks elevated toward camera prominently displayed tight athletic ass cheeks smooth spray-tanned skin spread wide from bent position smooth waxed asshole completely visible between parted cheeks pussy lips visible hanging down from behind gravity pulls vulva full smooth inner pink lips hint visible between folds legs straight knees locked hamstrings stretched reaching arms toward floor grabbing white towel bare breasts hanging down from gravity nipples point toward floor head down hair falls forward completely unaware how explicitly exposed position messy bedroom scene authentic domestic moment girlfriend bending over completely naked casual nudity perfect explicit rear display">🧺 Naked Towel Pickup</option>
                            </select>
                        </div>
                    </div>

                    {/* Appearance Customization */}
                    <div style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#fff' }}>
                            Appearance Customization
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                            {/* Age Slider */}
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    <span>👤 Age</span>
                                    <span style={{ color: '#fff', fontWeight: '600' }}>{age} years</span>
                                </label>
                                <input
                                    type="range"
                                    min="16"
                                    max="45"
                                    value={age}
                                    onChange={(e) => setAge(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: '#fff' }}
                                />
                            </div>

                            {/* Breast Size Slider */}
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    <span>💎 Breast Size</span>
                                    <span style={{ color: '#fff', fontWeight: '600' }}>
                                        {['Flat', 'Petite (A)', 'Modest (B)', 'Medium (C)', 'Full (C+)', 'D-Cup'][breastSize - 1]}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="6"
                                    value={breastSize}
                                    onChange={(e) => setBreastSize(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: '#fff' }}
                                />
                            </div>

                            {/* Height Slider */}
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    <span>📏 Height</span>
                                    <span style={{ color: '#fff', fontWeight: '600' }}>
                                        {['Very Petite (150cm)', 'Petite (160cm)', 'Average (168cm)', 'Tall (175cm)', 'Very Tall (180cm)'][height - 1]}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: '#ba55d3' }}
                                />
                            </div>

                            {/* Hair Length Slider */}
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    <span>💇 Hair Length</span>
                                    <span style={{ color: '#fff', fontWeight: '600' }}>
                                        {['Pixie', 'Short', 'Shoulder', 'Long', 'Very Long'][hairLength - 1]}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={hairLength}
                                    onChange={(e) => setHairLength(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: '#ba55d3' }}
                                />
                            </div>

                            {/* Body Type Dropdown */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    🏋️ Body Type
                                </label>
                                <select
                                    value={bodyType}
                                    onChange={(e) => setBodyType(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: 'black',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="slim">Slim & Slender</option>
                                    <option value="athletic">Athletic & Toned</option>
                                    <option value="curvy">Curvy & Soft</option>
                                    <option value="thick">Thick & Voluptuous</option>
                                </select>
                            </div>

                            {/* Skin Tone Dropdown */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    🎨 Skin Tone
                                </label>
                                <select
                                    value={skinTone}
                                    onChange={(e) => setSkinTone(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: 'black',
                                        border: '1px solid #333',
                                        color: '#ba55d3',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="pale">Porcelain Pale</option>
                                    <option value="fair">Fair & Natural</option>
                                    <option value="tan">Sun-Kissed Tan</option>
                                    <option value="olive">Olive Mediterranean</option>
                                    <option value="brown">Rich Caramel</option>
                                    <option value="deep">Deep Ebony</option>
                                </select>
                            </div>

                            {/* Hair Color Dropdown */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
                                    💈 Hair Color
                                </label>
                                <select
                                    value={hairColor}
                                    onChange={(e) => setHairColor(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: 'black',
                                        border: '1px solid #333',
                                        color: '#ba55d3',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="blonde">Blonde / Golden</option>
                                    <option value="brunette">Brunette / Chestnut</option>
                                    <option value="black">Black / Raven</option>
                                    <option value="red">Red / Ginger</option>
                                    <option value="auburn">Auburn / Copper</option>
                                </select>
                            </div>
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
                        📐 Aspect Ratio
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
                        ⚠️ Please configure a LoRA in Settings first
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
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        🛑 Cancel
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
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        borderRadius: '6px',
                                        cursor: isProcessingRef.current ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        opacity: isProcessingRef.current ? 0.5 : 1
                                    }}
                                >
                                    🗑️ Clear Queue
                                </button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {queue.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{
                                        padding: '12px',
                                        background: idx === 0 && isProcessingRef.current ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
                                        border: `1px solid ${idx === 0 && isProcessingRef.current ? '#22c55e' : '#333'}`,
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
                                                    color: idx === 0 && isProcessingRef.current ? '#22c55e' : '#fff',
                                                    background: idx === 0 && isProcessingRef.current ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {idx === 0 && isProcessingRef.current ? '🔄 PROCESSING' : `#${idx + 1}`}
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
                                            ❌
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isProcessingRef.current && (
                            <div style={{
                                marginTop: '12px',
                                padding: '10px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid #22c55e',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#22c55e',
                                fontWeight: '600'
                            }}>
                                🔄 Queue is processing... Item 1 of {queue.length}
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
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
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
                                            background: '#fff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        💾 Save
                                    </button>
                                    <button
                                        onClick={() => handlePostToFanvue(imageUrl)}
                                        disabled={isPosting === imageUrl}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#0ea5e9',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: isPosting === imageUrl ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            opacity: isPosting === imageUrl ? 0.7 : 1
                                        }}
                                    >
                                        {isPosting === imageUrl ? '⏳...' : '🚀 Post'}
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
                                        🎬 → Chain
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
                                        ⬇️
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
