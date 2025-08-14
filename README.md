# URL.40 - Article Summarizer & Note Generator

A modern web application that extracts content from URLs, generates AI-powered summaries, and creates organized bullet-point notes using **Hugging Face** AI models.

## Features

- **URL Processing**: Automatically scrapes and extracts content from web articles
- **AI Summarization**: Generates informative summaries using Hugging Face models (BART, DialoGPT)
- **Smart Notes**: Creates organized bullet-point notes with headers and key insights
- **Local Storage**: Saves article history for quick access

## Usage

1. **Paste a URL** - Enter any article URL in the input field
2. **Get Summary** - The app automatically extracts content and generates a summary
3. **View Notes** - Organized bullet-point notes are created from the summary
4. **Access History** - Previously processed articles are saved locally for quick access
5. **Copy URLs** - Click the copy icon to copy article URLs to clipboard

## API Endpoints

- `POST /api/summarize` - Generates article summaries using Hugging Face BART model
- `POST /api/notes` - Creates bullet-point notes from summaries using DialoGPT

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **AI**: Hugging Face Transformers (BART, DialoGPT)
- **Web Scraping**: Cheerio
- **Icons**: Lucide React, FontAwesome

## AI Models Used

- **Summarization**: `facebook/bart-large-cnn` - Optimized for news article summarization
- **Note Generation**: `microsoft/DialoGPT-medium` - Generates structured conversational text
- **Fallback**: Local text processing when AI services are unavailable
