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
- **50 Parallel Requests** - Blazing fast translation
- **Smart Chunking** - Processes 75 subtitle blocks per request for optimal speed/accuracy balance
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
| **Chunk Size** | 75 | Number of subtitle blocks per API request |
| **Parallel Requests** | 50 | Maximum concurrent API calls |

### Recommended Model

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

### The Marker System

Traditional AI translation loses track of which text belongs to which subtitle block. We solve this with markers:

**Input to AI:**
```
[B1] I don't think OpenAI will
[B2] be around in 5 years.
[B3] They're burning cash.
```

**AI Output:**
```
[B1] OpenAI'ın var olacağını
[B2] 5 yıl içinde sanmıyorum.
[B3] Paralarını yakıyorlar.
```

Each `[B#]` marker ensures the translated text maps back to the correct timestamp.

### Translation Priority

1. **Line Structure** (Mandatory) - Each marker line stays separate
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
