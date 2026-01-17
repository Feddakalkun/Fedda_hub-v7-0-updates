# Fanvue Hub - Release v1.60.126

Clean distribution-ready release package. This is a fully portable Windows installation with all necessary components bundled.

## System Requirements

- **Operating System**: Windows 10/11
- **GPU**: NVIDIA GPU with **CUDA 12.x drivers** (12.4+ recommended)
- **VRAM**: 8GB minimum (12GB+ recommended for best performance)
- **RAM**: 16GB minimum
- **Storage**: ~50GB for full installation (excluding models)

## What's Included

### Core Components
- **ComfyUI**: AI image generation engine (cloned during install)
- **Fanvue Hub**: Next.js-based web dashboard
- **Ollama**: Local LLM runtime
- **VoxCPM**: Local text-to-speech engine
- **Portable Python 3.11.9**: Embedded Python runtime
- **Portable Git**: MinGit for repository management
- **Portable Node.js 20.11.0**: For the dashboard

### Key Features
- PyTorch 2.5.1 with CUDA 12.4 support
- Xformers 0.0.28.post3 for optimized attention
- SageAttention 1.0.6 for enhanced performance
- Comprehensive custom node ecosystem
- LoRA model support with auto-discovery
- Character-based AI personas
- Image and video generation workflows

## Installation

### Quick Start

1. **Ensure CUDA 12.x is installed**
   ```powershell
   # Verify installation
   nvcc --version
   nvidia-smi
   ```

2. **Run the installer**
   ```powershell
   install.bat
   ```
   This will:
   - Download and configure portable Python, Git, Node.js
   - Clone ComfyUI repository
   - Install PyTorch 2.5.1 + CUDA 12.4
   - Install Xformers and SageAttention
   - Set up all custom nodes
   - Configure Fanvue Hub dashboard

3. **Download the demo character (Emmy)**
   ```powershell
   download-emmy.bat
   ```

4. **Launch everything**
   ```powershell
   run.bat
   ```

### What `run.bat` Does

Launches all services in separate windows:
- **Ollama** (port 11434): LLM backend
- **ComfyUI** (port 8188): Image generation
- **VoxCPM** (port 9886): Voice synthesis
- **Fanvue Hub** (port 3000): Dashboard UI

## Configuration

All configuration happens automatically during installation, but you can customize:

### Update Settings
Run `update.bat` to pull the latest fixes and improvements from the GitHub repository.

### Environment Variables
Create `.env.local` in the `fanvue-hub` directory:
```env
COMFYUI_URL=http://localhost:8188
OLLAMA_URL=http://localhost:11434
VOXCPM_PORT=9886
```

## API Fixes Included

This release includes critical fixes:
- ✅ **ComfyUI Status Route**: Fixed `getPromptStatus` method call
- ✅ **LoRA Path Handling**: Windows backslash preservation for ComfyUI compatibility
- ✅ **Characters Page**: Correct API endpoint usage
- ✅ **PyTorch CUDA 12.4**: Stable xformers + SageAttention support

## Troubleshooting

### Xformers Not Working
If you see "Failed to find CUDA" errors:
1. Verify CUDA 12.x is installed: `nvcc --version`
2. Update GPU drivers to latest
3. Reinstall PyTorch: `python_embeded\python.exe -m pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124`

### Common Issues
- **Port conflicts**: Check if ports 3000, 8188, 11434, or 9886 are already in use
- **Out of VRAM**: Reduce batch sizes or use lower resolution settings
- **Missing models**: Download required checkpoints to `ComfyUI/models/checkpoints/`

## Distribution Notes

This is a **clean release** with no personal data:
- No API keys included
- No user-specific configurations
- No private workflows
- Ready for distribution to end users

## Support

For issues or questions, refer to:
- ComfyUI Documentation: https://github.com/comfyanonymous/ComfyUI
- GitHub Issues: [Your repository URL]

## License

Refer to individual component licenses in their respective directories.

---

**Package Version**: 1.60.126  
**Build Date**: 2026-01-16  
**PyTorch**: 2.5.1+cu124  
**Xformers**: 0.0.28.post3  
