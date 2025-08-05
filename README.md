# URL.40 - Article Summarizer & Note Generator

A modern web application that extracts content from URLs, generates AI-powered summaries, and creates organized bullet-point notes using OpenAI's GPT models.

## Features

- **URL Processing**: Automatically scrapes and extracts content from web articles
- **AI Summarization**: Generates concise, informative summaries using OpenAI GPT-4o-mini
- **Smart Notes**: Creates organized bullet-point notes with headers and key insights
- **Local Storage**: Saves your article history for quick access

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kluey/url40.git
   cd url40
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Paste a URL** - Enter any article URL in the input field
2. **Get Summary** - The app automatically extracts content and generates a summary
3. **View Notes** - Organized bullet-point notes are created from the summary
4. **Access History** - Previously processed articles are saved locally for quick access
5. **Copy URLs** - Click the copy icon to copy article URLs to clipboard

## API Endpoints

- `POST /api/summarize` - Generates article summaries
- `POST /api/notes` - Creates bullet-point notes from summaries

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **AI**: OpenAI GPT-4o-mini
- **Web Scraping**: Cheerio
- **Icons**: Lucide React, FontAwesome

## Project Structure

```
url40/
├── app/
│   ├── api/
│   │   ├── summarize/       # Article summarization endpoint
│   │   └── notes/           # Notes generation endpoint
│   ├── services/            # Redux API services
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main application page
├── public/                  # Static assets
└── ...config files
```
