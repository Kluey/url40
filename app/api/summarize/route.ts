import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import * as cheerio from 'cheerio';
import { rateLimit, validateUrl, sanitizeContent } from '../../utils/security';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function scrapeArticle(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) {
      throw new Error('URL does not point to an HTML page');
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .comments, .sidebar, .menu, .navigation, .popup, .modal, iframe, noscript').remove();
    
    let content = '';
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.article-body',
      '.post-body',
      'main',
      '.main-content',
      '#content',
      '#main'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 300) {
        content = element.text().trim();
        break;
      }
    }
    
    if (!content) {
      content = $('body').text().trim();
    }
    
    content = sanitizeContent(content);
    
    const maxLength = 12000;
    if (content.length > maxLength) {
      const sentences = content.split(/[.!?]+/);
      let truncated = '';
      for (const sentence of sentences) {
        if ((truncated + sentence).length > maxLength) break;
        truncated += sentence + '.';
      }
      content = truncated || content.substring(0, maxLength);
    }
    
    if (content.length < 100) {
      throw new Error('Insufficient content extracted from the page');
    }
    
    return content;
  } catch (error) {
    console.error('Error scraping article:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to scrape article: ${error.message}`);
    }
    throw new Error('Failed to scrape article content');
  }
}

function formatBasicSummary(summaryText: string, url: string): string {
  const cleanSummary = summaryText.trim();
  
  const lines = cleanSummary.split(/[.!?]+/).filter(line => line.trim().length > 10);
  
  let formatted = `This article provides insights on the topic covered at ${new URL(url).hostname}. `;
  formatted += `${cleanSummary.substring(0, 200)}...\n\n`;
  
  formatted += '## Key Points\n';
  lines.slice(0, 3).forEach(line => {
    if (line.trim()) {
      formatted += `- ${line.trim()}\n`;
    }
  });
  
  formatted += '\n## Main Content\n';
  formatted += `${cleanSummary}\n\n`;
  
  formatted += '## Takeaways\n';
  formatted += '- Review the full article for comprehensive understanding\n';
  formatted += '- Consider the context and source reliability\n';
  
  return formatted;
}

function generateFallbackSummary(content: string, url: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  const keyPoints = [
    ...sentences.slice(0, 2),
    ...sentences.slice(Math.floor(sentences.length / 3), Math.floor(sentences.length / 3) + 2),
    ...sentences.slice(-2)
  ].filter((sentence, index, array) => array.indexOf(sentence) === index);
  
  let summary = `This article from ${new URL(url).hostname} covers important information on the topic. `;
  summary += `Here's a summary based on the key content identified.\n\n`;
  
  summary += '## Key Points\n';
  keyPoints.slice(0, 4).forEach(point => {
    summary += `- ${point.trim()}\n`;
  });
  
  summary += '\n## Main Content\n';
  summary += `The article discusses various aspects of the topic with detailed information. `;
  summary += `Key insights include the main themes and supporting details found throughout the content.\n\n`;
  
  summary += '## Takeaways\n';
  summary += '- This summary was generated using local processing due to service limitations\n';
  summary += '- Review the original article for complete information\n';
  summary += '- Consider verifying information from additional sources\n';
  
  return summary;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!rateLimit(ip, 5, 60000)) { // 5 requests per minute
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    if (!validateUrl(url)) {
      return NextResponse.json({ error: 'Please provide a valid HTTP or HTTPS URL' }, { status: 400 });
    }
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
    }
    
    const articleContent = await scrapeArticle(url);
    
    try {
      const initialSummary = await hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: articleContent,
        parameters: {
          max_length: 300,
          min_length: 100,
          do_sample: false,
        }
      });

      const enhancedSummary = await hf.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: `Transform this summary into a well-structured format with overview, key points, main content, important details, and takeaways:

${initialSummary.summary_text}

Enhanced summary with sections:`,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.3,
          do_sample: true,
          return_full_text: false,
        }
      });

      let summary = enhancedSummary.generated_text;
      
      if (!summary || summary.length < 200 || !summary.includes('##')) {
        summary = formatBasicSummary(initialSummary.summary_text, url);
      }

      summary = summary.trim();
      if (summary.startsWith('Enhanced summary with sections:')) {
        summary = summary.replace('Enhanced summary with sections:', '').trim();
      }

      return NextResponse.json({ 
        summary,
        url,
        timestamp: new Date().toISOString(),
        wordCount: summary.split(' ').length,
        model: 'facebook/bart-large-cnn + microsoft/DialoGPT-medium'
      });

    } catch (hfError) {
      console.error('Hugging Face API error:', hfError);
      
      const fallbackSummary = generateFallbackSummary(articleContent, url);
      
      return NextResponse.json({ 
        summary: fallbackSummary,
        url,
        timestamp: new Date().toISOString(),
        wordCount: fallbackSummary.split(' ').length,
        model: 'fallback-local-processing'
      });
    }
    
  } catch (error) {
    console.error('Error in summarize API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        return NextResponse.json(
          { error: 'The website took too long to respond. Please try a different URL.' },
          { status: 408 }
        );
      }
      
      if (error.message.includes('HTTP 403') || error.message.includes('HTTP 401')) {
        return NextResponse.json(
          { error: 'Access denied by the website. This content may not be publicly accessible.' },
          { status: 403 }
        );
      }
      
      if (error.message.includes('HTTP 404')) {
        return NextResponse.json(
          { error: 'The webpage could not be found. Please check the URL.' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process the article. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
