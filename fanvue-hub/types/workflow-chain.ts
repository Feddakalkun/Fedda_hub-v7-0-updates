export interface WorkflowClip {
    id: string;
    type: 'image' | 'lipsync' | 'wan21';
    url: string;
    lastFrameUrl?: string;
    prompt?: string;
    audioUrl?: string; // For lipsync clips
    timestamp: number;
    metadata: {
        originalPrompt?: string;
        enhancedPrompt?: string;
        ollamaTags?: string[];
        ollamaDescription?: string;
        resolution?: string;
        seed?: number;
        duration?: number; // For videos
    };
}

export interface WorkflowChainSession {
    id: string;
    name: string;
    clips: WorkflowClip[];
    createdAt: number;
    updatedAt: number;
}
