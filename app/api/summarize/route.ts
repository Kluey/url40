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
  const domain = new URL(url).hostname.replace('www.', '');
  
  // Split into sentences for better structure
  const sentences = cleanSummary.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  let formatted = `This article from ${domain} provides comprehensive information on the topic. `;
  
  if (sentences.length > 0) {
    formatted += `${sentences[0].trim()}. `;
    
    if (sentences.length > 1) {
      formatted += `${sentences[1].trim()}. `;
    }
    
    formatted += `The content explores various aspects of the subject matter, offering detailed insights and analysis.\n\n`;
    
    // Add main content
    if (sentences.length > 2) {
      formatted += `The article covers several important points. `;
      sentences.slice(2, Math.min(5, sentences.length)).forEach(sentence => {
        formatted += `${sentence.trim()}. `;
      });
    } else {
      formatted += cleanSummary;
    }
    
    formatted += `\n\nThis comprehensive coverage provides valuable insights for readers interested in understanding the topic more deeply. `;
    formatted += `The information presented offers both theoretical understanding and practical applications, making it a useful resource for further exploration of the subject matter.`;
    
  } else {
    formatted += `The content covers important aspects and key insights.\n\n`;
    formatted += cleanSummary;
    formatted += `\n\nThis article offers comprehensive coverage of the topic with actionable insights and detailed information for readers seeking to understand the subject matter better.`;
  }
  
  return formatted;
}

function generateFallbackSummary(content: string, url: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Extract domain for context
  const domain = new URL(url).hostname.replace('www.', '');
  
  // Find key sentences with important indicators
  const importantIndicators = [
    'important', 'significant', 'key', 'main', 'primary', 'essential', 'critical',
    'major', 'fundamental', 'central', 'core', 'crucial', 'vital', 'notable'
  ];
  
  const factualIndicators = [
    'study', 'research', 'data', 'analysis', 'report', 'survey', 'evidence',
    'according to', 'statistics', 'findings', 'results', 'discovered', 'found'
  ];
  
  const actionIndicators = [
    'should', 'must', 'need', 'recommend', 'suggest', 'advise', 'propose',
    'consider', 'implement', 'develop', 'create', 'establish', 'ensure'
  ];
  
  // Categorize sentences
  const keySentences = sentences.filter(sentence => 
    importantIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator)
    )
  ).slice(0, 4);
  
  const factualSentences = sentences.filter(sentence => 
    factualIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator)
    )
  ).slice(0, 3);
  
  const actionSentences = sentences.filter(sentence => 
    actionIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator)
    )
  ).slice(0, 2);
  
  // Get opening and key content
  const openingSentences = sentences.slice(0, 3);
  const middleContent = sentences.slice(Math.floor(sentences.length * 0.3), Math.floor(sentences.length * 0.7));
  const concludingSentences = sentences.slice(-2);
  
  // Build flowing comprehensive summary
  let summary = `This article from ${domain} provides comprehensive information on the topic. `;
  
  // Opening paragraph - context and introduction
  if (openingSentences.length > 0) {
    summary += `${openingSentences[0].trim()}. `;
    if (openingSentences.length > 1) {
      summary += `${openingSentences[1].trim()}. `;
    }
  }
  
  summary += `The content explores various aspects of the subject matter, offering detailed insights and analysis.\n\n`;
  
  // Main content paragraph - key information and findings
  if (keySentences.length > 0) {
    summary += `Key findings and important information include several significant points. `;
    keySentences.slice(0, 2).forEach(sentence => {
      summary += `${sentence.trim()}. `;
    });
  } else if (middleContent.length > 0) {
    summary += `The article covers important aspects of the topic. `;
    middleContent.slice(0, 2).forEach(sentence => {
      summary += `${sentence.trim()}. `;
    });
  }
  
  // Add factual information if available
  if (factualSentences.length > 0) {
    summary += `Supporting evidence and research findings demonstrate the significance of these insights. `;
    factualSentences.slice(0, 2).forEach(sentence => {
      summary += `${sentence.trim()}. `;
    });
  }
  
  summary += `\n\n`;
  
  // Concluding paragraph - implications and takeaways
  summary += `The information presented offers valuable insights for readers interested in understanding the topic more deeply. `;
  
  if (actionSentences.length > 0) {
    actionSentences.forEach(sentence => {
      summary += `${sentence.trim()}. `;
    });
  } else if (concludingSentences.length > 0) {
    concludingSentences.forEach(sentence => {
      summary += `${sentence.trim()}. `;
    });
  }
  
  summary += `This comprehensive coverage provides both theoretical understanding and practical applications, making it a valuable resource for anyone seeking to learn more about the subject matter.`;
  
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

      // Use a better model for structured text generation
      const enhancedSummary = await hf.textGeneration({
        model: 'google/flan-t5-large',
        inputs: `Create a comprehensive, well-written summary of the following content. Write it as a flowing, informative article summary that covers all the key points naturally. 

Requirements:
- Write 3-4 well-structured paragraphs
- Include the most important information and insights
- Mention specific details, facts, or examples when available
- Make it informative and easy to read
- Conclude with the key takeaways or significance
- Write in a professional, engaging tone

Do not use section headers or bullet points. Write it as a cohesive, flowing summary.

Content: "${initialSummary.summary_text}"

Comprehensive summary:`,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.3,
          do_sample: true,
          return_full_text: false,
        }
      });

      let summary = enhancedSummary.generated_text;
      
      if (!summary || summary.length < 150) {
        summary = formatBasicSummary(initialSummary.summary_text, url);
      } else {
        // Clean up and format the response
        summary = summary.trim();
        
        // Remove any response prefixes
        const prefixes = [
          'Comprehensive summary:', 'Professional summary:', 'Summary:', 
          'Here is the summary:', 'The summary is:', 'Based on the content:'
        ];
        
        for (const prefix of prefixes) {
          if (summary.toLowerCase().startsWith(prefix.toLowerCase())) {
            summary = summary.substring(prefix.length).trim();
          }
        }
        
        // Clean up any unwanted formatting artifacts
        summary = summary.replace(/\n{3,}/g, '\n\n');
        summary = summary.replace(/^\s*-\s*/gm, ''); // Remove bullet points if any
        summary = summary.replace(/^#+\s*/gm, ''); // Remove headers if any
        
        // If the AI response is still not good enough, use enhanced fallback
        if (summary.length < 200) {
          summary = formatBasicSummary(initialSummary.summary_text, url);
        }
      }

      return NextResponse.json({ 
        summary,
        url,
        timestamp: new Date().toISOString(),
        wordCount: summary.split(' ').length,
        model: 'facebook/bart-large-cnn + google/flan-t5-large'
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
