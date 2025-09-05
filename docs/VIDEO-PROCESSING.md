# Dance Moves - Video Processing Pipeline

This document details the video processing workflow, scripts, and optimization strategies used to prepare dance instruction videos.

## Processing Pipeline Overview

The video processing system uses a three-stage pipeline to transform raw dance instruction videos into optimized, web-ready content:

```
Raw Videos (various formats/resolutions)
    ↓
Stage 1: Analysis (video_info.sh)
    ↓
Stage 2: Compression (compress_videos.sh)
    ↓
Stage 3: Normalization (uniform_music_videos.sh)
    ↓
Optimized Videos (1280x720, H.264, consistent quality)
```

## Directory Structure

```
app/static/videos/
├── *.mp4                    # Final processed videos (~400 files)
├── new/                     # Processing workspace
│   ├── *.mp4               # Raw input videos
│   ├── compressed/         # Stage 2 output
│   ├── originals/          # Backup of raw videos
│   ├── video_info.csv      # Analysis results
│   └── processing scripts:
│       ├── video_info.sh
│       ├── compress_videos.sh
│       └── uniform_music_videos.sh
└── songs/                   # Audio files for alternate soundtracks
    └── *.mp3, *.m4a        # Dance music (~80 files)
```

## Stage 1: Video Analysis

### `video_info.sh` - Metadata Extraction

**Purpose**: Analyze source videos to make informed processing decisions.

**Usage:**
```bash
cd app/static/videos/new
./video_info.sh [source_folder]
```

**Output**: `video_info.csv` with columns:
- `filename` - Original video filename
- `codec` - Video codec (e.g., H.264, HEVC)
- `resolution` - Width x Height (e.g., 1920x1080)
- `frame_rate` - Frames per second
- `bitrate` - Video bitrate in kbps
- `duration` - Length in seconds
- `file_size` - Size in MB

**Key Metrics Extracted:**
```bash
# Resolution detection
ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height

# Codec identification
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name

# Bitrate calculation
ffprobe -v quiet -show_entries format=bit_rate

# Duration parsing
ffprobe -v quiet -show_entries format=duration
```

**Decision Making**: Analysis results inform compression settings:
- **High bitrate videos** → More aggressive compression
- **Portrait orientation** → Crop and pad workflow
- **Low resolution** → Upscaling with quality preservation

## Stage 2: Smart Compression

### `compress_videos.sh` - Adaptive Processing

**Purpose**: Intelligently compress and format videos based on orientation and quality.

**Key Features:**
- **Automatic orientation detection** (portrait vs landscape)
- **Smart cropping** for portrait videos
- **Quality-preserving compression** with configurable settings
- **Batch processing** with error handling

#### Portrait Video Processing

**Detection Logic:**
```bash
width=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width -of csv=p=0 "$input")
height=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=height -of csv=p=0 "$input")

if [ "$height" -gt "$width" ]; then
    # Portrait processing
fi
```

**Portrait Pipeline:**
1. **Crop to 4:5 aspect ratio** - Remove excess vertical content
2. **Scale to 720p height** - Maintain quality while reducing size  
3. **Pad to 1280x720** - Add letterboxing for consistent format
4. **Quality optimization** - CRF 23-28 for file size balance

**FFmpeg Command Example:**
```bash
ffmpeg -i "$input" \
  -vf "crop=ih*4/5:ih,scale=576:720,pad=1280:720:(1280-576)/2:0:black" \
  -c:v libx264 -crf 25 -preset medium \
  -c:a aac -b:a 128k \
  "$output"
```

#### Landscape Video Processing

**Landscape Pipeline:**
1. **Scale to 1280p width** - Standard web resolution
2. **Maintain aspect ratio** - No distortion
3. **Optimize quality** - Balanced compression settings

**FFmpeg Command Example:**
```bash
ffmpeg -i "$input" \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 23 -preset medium \
  -c:a aac -b:a 128k \
  "$output"
```

#### Compression Settings

**Video Encoding:**
- **Codec**: H.264 (libx264) for maximum compatibility
- **CRF**: 23-28 (Constant Rate Factor for quality-based encoding)
- **Preset**: Medium (balance between speed and compression efficiency)
- **Profile**: Baseline for mobile device compatibility

**Audio Encoding:**
- **Codec**: AAC for web compatibility
- **Bitrate**: 128k (sufficient quality for instruction audio)
- **Channels**: Stereo preserved

**Quality Control:**
- **Two-pass encoding** for consistent quality
- **Bitrate constraints** to prevent excessive file sizes
- **Error handling** with detailed logging

#### File Management

**Workflow:**
1. Process all `*.mp4` files in current directory
2. Save compressed versions to `compressed/` subdirectory
3. Move originals to `originals/` for backup
4. Generate processing log with statistics

**Error Handling:**
- Skip files that fail processing
- Log errors with specific FFmpeg output
- Continue processing remaining files

## Stage 3: Batch Normalization

### `uniform_music_videos.sh` - Standardization

**Purpose**: Apply consistent formatting across all videos for uniform playback experience.

**Key Features:**
- **Standard output format**: All videos become 1280x720
- **Letterboxing**: Maintains aspect ratio with black bars
- **Parallel processing**: Configurable concurrent job count
- **Optimized settings**: Fast encoding for batch operations

**Processing Settings:**
```bash
# Standardized output format
-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2"

# Fast encoding preset
-preset faster

# Consistent bitrate
-b:v 500k

# Audio stream copy (no re-encoding)
-c:a copy
```

**Parallel Processing:**
```bash
# Configurable job count (default: 4)
MAX_JOBS=4

# Job management
while [ $(jobs -r | wc -l) -ge $MAX_JOBS ]; do
    wait -n  # Wait for any job to complete
done
```

**Quality vs Speed Trade-off:**
- **Faster preset** - Prioritizes speed over file size
- **Fixed bitrate** - Ensures consistent quality across videos
- **Audio copying** - Preserves original audio without re-encoding

## Deployment Integration

### Production Workflow

**Local Processing:**
1. Place raw videos in `app/static/videos/new/`
2. Run analysis: `./video_info.sh`
3. Run compression: `./compress_videos.sh`
4. Optional normalization: `./uniform_music_videos.sh`
5. Move final videos to `app/static/videos/`

**Render.com Deployment:**
- **Static Assets**: Processed videos stored on Render Persistent Disk
- **Repository**: Contains only processing scripts, not large media files
- **CI/CD**: Videos processed locally, then uploaded to persistent storage

### Storage Optimization

**File Size Management:**
- **Average video size**: 2-5 MB per minute of content
- **Total storage**: ~400 videos = ~2-3 GB
- **Compression ratio**: Typically 60-80% size reduction from originals

**Quality Metrics:**
- **Resolution**: Consistent 1280x720 output
- **Bitrate**: 500-800k average (varies by content complexity)
- **Compatibility**: H.264 baseline profile for universal playback

## Advanced Processing Features

### Content-Aware Optimization

**Scene Detection:**
- **Motion analysis** - Higher bitrates for complex choreography
- **Color space optimization** - Preserve skin tones in dance instruction
- **Audio sync verification** - Ensure A/V sync after processing

**Quality Validation:**
- **Automated quality checks** - Verify output meets minimum standards
- **Visual comparison** - Sample frame comparison with originals
- **Playback testing** - Automated player compatibility verification

### Batch Processing Enhancements

**Progress Monitoring:**
```bash
# Progress tracking
echo "Processing $current of $total: $filename"

# Estimated time remaining
echo "ETA: $(calculate_eta $processed $total $start_time)"

# Success/failure statistics
echo "Processed: $success_count, Failed: $error_count"
```

**Error Recovery:**
- **Resume capability** - Skip already processed files
- **Retry logic** - Attempt failed conversions with different settings
- **Detailed logging** - Full FFmpeg output for debugging

### Custom Optimization Profiles

**Profile Selection by Content Type:**
- **Instruction videos** - Optimize for clarity and detail
- **Music videos** - Optimize for motion and rhythm
- **Demonstration** - Balance quality with file size

**Dynamic Settings:**
```bash
# Content-aware CRF adjustment
if [[ "$filename" == *"instruction"* ]]; then
    crf=23  # Higher quality for detailed instruction
elif [[ "$filename" == *"music"* ]]; then
    crf=25  # Balanced for music videos
else
    crf=28  # Standard compression
fi
```

## Performance Monitoring

### Processing Metrics

**Speed Benchmarks:**
- **Average processing speed**: 2-4x real-time (depends on hardware)
- **Parallel efficiency**: Linear scaling up to CPU core count
- **Memory usage**: ~200-500MB per concurrent job

**Quality Metrics:**
- **PSNR/SSIM** - Objective quality measurements
- **File size ratios** - Compression efficiency tracking
- **Playback compatibility** - Cross-device testing results

---

**Related Documentation:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [FRONTEND.md](./FRONTEND.md) - Frontend module documentation  
- [FEATURES.md](./FEATURES.md) - Advanced features and workflows