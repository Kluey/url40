# URL.40 - Article Summarizer

A modern web application that extracts content from URLs, generates AI-powered summaries, and creates organized bullet-point notes using **Hugging Face** AI models.

## Features

- **URL Processing**: Automatically scrapes and extracts content from web articles
- **AI Summarization**: Generates concise, informative summaries using Hugging Face models
- **Smart Notes**: Creates organized bullet-point notes with headers and key insights
- **Local Storage**: Saves your article history for quick access.

## Usage

1. **Paste a URL** - Enter any article URL in the input field
2. **Get Summary** - The app automatically extracts content and generates a comprehensive summary
3. **Access History** - Previously processed articles are saved locally for quick access
4. **Copy Content** - Click the copy icon to copy summaries or URLs to clipboard

## API Endpoints

- `POST /api/summarize` - Generates article summaries using Hugging Face models

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: Hugging Face Transformers
- **Web Scraping**: Cheerio
- **Icons**: Lucide React, FontAwesome

## AI Models Used

- **Summarization**: `google/flan-t5-large` - Optimized for structured text generation and summarization
- **Fallback**: Local text processing when AI services are unavailable
