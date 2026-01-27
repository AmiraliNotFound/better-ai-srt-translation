# SRT Translator

A powerful, browser-based tool for translating SRT subtitle files using AI. Built for speed, accuracy, and ease of use.

![SRT Translator UI](assets/ui.webp)

## 🎯 What Problem Does It Solve?

Translating subtitles is tedious and expensive:
- **Manual translation** is slow and costly
- **Generic AI translation** loses subtitle timing and structure
- **Existing tools** don't handle the unique challenges of SRT format (split sentences, timing markers, etc.)

**SRT Translator** solves this by:
1. Preserving all timestamps exactly as-is
2. Using a smart marker system to maintain line-by-line correspondence
3. Processing chunks in parallel for maximum speed
4. Allowing custom instructions for domain-specific terminology

## ✨ Features

- **Drag & Drop** - Just drop your SRT file and go
- **100 Parallel Requests** - Blazing fast translation
- **Smart Chunking** - Processes 20 subtitle blocks per request for optimal precision
- **Marker-Based Alignment** - Each subtitle block stays aligned with its timestamp
- **Custom Instructions** - Add context-specific translation rules (e.g., "Use informal 'sen' instead of formal 'siz'")
- **Custom Model Support** - Use any model available on OpenRouter
- **Multi-Language** - Translate to 15+ popular languages
- **Real-Time Progress** - Visual feedback for each chunk's status
- **Retry with Backoff** - Automatic retry on failures

## 🚀 Quick Start

1. Open `index.html` in your browser
2. Enter your [OpenRouter API key](https://openrouter.ai/keys)
3. Drop an SRT file
4. Select target language
5. Click "Translate"
6. Download your translated SRT

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| **Model** | `google/gemini-3-flash-preview` | AI model for translation |
| **Chunk Size** | 20 | Number of subtitle blocks per API request |
| **Parallel Requests** | 100 | Maximum concurrent API calls |

### Recommended Settings

**Chunk Size: 20** is recommended for better precision. Smaller chunks mean:
- Less text drift between subtitle blocks
- More accurate timing alignment
- Slightly more API calls, but with 100 parallel requests it's still fast

For the best **performance/cost** balance, we recommend:

```
google/gemini-3-flash-preview
```

This model offers:
- Fast response times
- Excellent instruction following
- Great translation quality
- Cost-effective pricing

Other options:
- `google/gemini-2.5-flash-lite` - Budget option, may have lower accuracy

## 🧠 How It Works

### The Problem: Text Drift

Subtitles split sentences across multiple timed blocks. The problem? **Languages have different structures.** 

English (SVO): "I **love** you" → Subject, Verb, Object  
Turkish (SOV): "Seni **seviyorum**" → Object, Subject+Verb

When you translate subtitle blocks independently, the words end up in wrong timestamps:

```
English Subtitles:          Turkish (Naive Translation):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[00:01] "I will not"    →   [00:01] "Bunu yapmayacağım"  ← Too long!
[00:02] "do this."      →   [00:02] ""                    ← Empty!
```

The AI translated the full sentence in Block 1, leaving Block 2 empty. Now timing is broken.

### The Solution: Markers

We inject `[B#]` markers to create explicit boundaries:

**Input to AI:**
```
[B1] Hello and welcome to
[B2] a new episode. Today we have
[B3] Chris Titus with us.
```

**AI Output:**
```
[B1] Merhaba ve yeni bir
[B2] bölüme hoş geldiniz. Bugün yanımızda
[B3] Chris Titus var.
```

Each marker acts as an anchor:
- `[B1]` content stays in Block 1's timestamp
- `[B2]` content stays in Block 2's timestamp
- Sentence boundaries can span blocks - that's fine!

### Smart Chunking

Chunks don't break at fixed sizes. We look for natural sentence endings (`. ! ?`) within the last 10 blocks:

```
Target: 20 blocks
Actual: 23 blocks (because sentence ends at block 23)
```

### Translation Priority

1. **Line Structure** (Mandatory) - Each `[B#]` stays on its own line
2. **Natural Translation** - Idiomatic, not word-for-word
3. **Word Count** (Soft) - Similar length per line when possible

## 📁 Project Structure

```
srt-translator/
├── index.html          # Main UI entry point
├── README.md           # Documentation
├── src/
│   ├── app.js          # Core application logic
│   └── styles.css      # Dark theme styling
└── assets/
    └── ui.webp         # UI screenshot
```

## 🔧 Custom Instructions Examples

**Turkish informal:**
```
Türkçe çeviride "siz" yerine "sen" formu kullan.
```

**Technical content:**
```
Keep technical terms like "API", "SDK", "cache" untranslated.
```

**YouTube tone:**
```
Use casual, engaging language suitable for YouTube videos.
```

## 📝 API Requirements

- **Provider:** [OpenRouter](https://openrouter.ai)
- **API Key:** Get one at https://openrouter.ai/keys
- **Models:** Any chat completion model on OpenRouter

## 🛡️ Privacy

- Your API key is stored locally in your browser (localStorage)
- SRT files are processed client-side
- Only subtitle text is sent to the AI API
- No data is stored on any server

## 📄 License

GPL-3.0 License
---

Built with ❤️ for content creators who need fast, accurate subtitle translations.
