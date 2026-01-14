# Fanvue Hub v6.0 - Updates Repository

This repository contains **only the files that have been updated** in Fanvue Hub v6.0.

## Purpose

Instead of downloading the entire application (ComfyUI, models, etc.), this repository allows users to:
- Download only changed files
- Fast, lightweight updates
- Preserve personal data and models

## For End Users

Simply run `update.bat` in your Fanvue Hub installation directory.

## For Developers

When pushing updates:
1. Only commit the specific files you changed
2. Maintain the same directory structure as the main app
3. Users' `update.bat` will overlay these files onto their installation

## Latest Updates

### 2026-01-14 - Queue System Rewrite
- Fixed image generator infinite loop bug
- Added ComfyUI interrupt for proper cancellation
- Removed auto VRAM clearing for faster batch processing
- Process-and-remove pattern eliminates race conditions

**Updated Files:**
- `fanvue-hub/components/ImageGenerator.tsx`
- `fanvue-hub/types/workflow-chain.ts`
- `fanvue-hub/components/WorkflowChainBuilder.tsx`
- `.gitignore`

## Structure

```
Fanvue_hub-v6-0-updates/
├── fanvue-hub/
│   ├── components/
│   │   └── ImageGenerator.tsx
│   └── types/
│       └── workflow-chain.ts
└── README.md
```

Only files that have been modified are included here.
