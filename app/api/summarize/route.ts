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
  
  let formatted = `## Overview\n`;
  formatted += `This article from ${domain} provides comprehensive information on the topic. `;
  
  if (sentences.length > 0) {
    formatted += `${sentences[0].trim()}.\n\n`;
  } else {
    formatted += `The content covers important aspects and key insights.\n\n`;
  }
  
  formatted += `## Key Points\n`;
  if (sentences.length >= 3) {
    sentences.slice(0, 4).forEach(sentence => {
      formatted += `- ${sentence.trim()}\n`;
    });
  } else {
    // Break down the summary into key points
    const words = cleanSummary.split(' ');
    const chunks = [];
    for (let i = 0; i < words.length; i += 20) {
      chunks.push(words.slice(i, i + 20).join(' '));
    }
    chunks.slice(0, 4).forEach(chunk => {
      if (chunk.trim()) formatted += `- ${chunk.trim()}\n`;
    });
  }
  
  formatted += `\n## Main Content\n`;
  formatted += `${cleanSummary}\n\n`;
  
  formatted += `## Key Takeaways\n`;
  formatted += `- The article provides valuable insights on the topic\n`;
  formatted += `- Important information is presented with supporting details\n`;
  formatted += `- Readers can apply these insights to relevant situations\n\n`;
  
  formatted += `## Summary\n`;
  formatted += `This content from ${domain} offers comprehensive coverage of the topic with actionable insights and detailed information.`;
  
  return formatted;
}

function generateFallbackSummary(content: string, url: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  
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
  ).slice(0, 3);
  
  // Get opening context (first meaningful sentences)
  const openingSentences = sentences.slice(0, 3);
  
  // Get concluding context (last meaningful sentences)  
  const concludingSentences = sentences.slice(-2);
  
  // Build intelligent summary
  let summary = `## Overview\n`;
  summary += `This article from ${domain} provides comprehensive information on the topic. `;
  
  if (openingSentences.length > 0) {
    const cleanOpening = openingSentences[0].trim();
    summary += `${cleanOpening}. `;
  }
  
  if (openingSentences.length > 1) {
    const cleanSecond = openingSentences[1].trim();
    summary += `${cleanSecond}.\n\n`;
  } else {
    summary += `The content explores various aspects and provides detailed insights.\n\n`;
  }
  
  summary += `## Key Points\n`;
  if (keySentences.length > 0) {
    keySentences.forEach(sentence => {
      summary += `- ${sentence.trim()}\n`;
    });
  } else {
    // Fallback to first few sentences if no key indicators found
    sentences.slice(0, 4).forEach(sentence => {
      summary += `- ${sentence.trim()}\n`;
    });
  }
  
  summary += `\n## Main Content\n`;
  if (paragraphs.length > 1) {
    summary += `The article is structured into several key sections. `;
    
    // Extract main themes from paragraph starts
    const themes = paragraphs.slice(0, 3).map(para => {
      const firstSentence = para.split(/[.!?]+/)[0];
      return firstSentence.trim();
    }).filter(theme => theme.length > 10);
    
    if (themes.length > 0) {
      summary += `Key themes include: ${themes.join(', ')}. `;
    }
    
    // Add middle content summary
    const middleIndex = Math.floor(sentences.length / 2);
    if (sentences[middleIndex]) {
      summary += `${sentences[middleIndex].trim()}`;
    }
  } else {
    summary += `The content covers the topic comprehensively with detailed explanations and supporting information.`;
  }
  
  if (factualSentences.length > 0) {
    summary += `\n\n## Supporting Evidence\n`;
    factualSentences.forEach(sentence => {
      summary += `- ${sentence.trim()}\n`;
    });
  }
  
  summary += `\n## Key Takeaways\n`;
  if (actionSentences.length > 0) {
    actionSentences.forEach(sentence => {
      summary += `- ${sentence.trim()}\n`;
    });
  } else if (concludingSentences.length > 0) {
    concludingSentences.forEach(sentence => {
      summary += `- ${sentence.trim()}\n`;
    });
  } else {
    summary += `- Review the complete article for comprehensive understanding\n`;
    summary += `- Consider the context and source credibility\n`;
    summary += `- Apply the insights to relevant situations\n`;
  }
  
  summary += `\n## Summary\n`;
  summary += `This content from ${domain} provides valuable insights on the topic. `;
  summary += `The information is presented with supporting details and actionable guidance for readers.`;
  
  return summary;
}

function convertToMarkdownSummary(text: string): string {
  let converted = text.trim();
  
  // Convert **Bold Headers** to ## Markdown Headers
  converted = converted.replace(/\*\*(Overview|Key Points|Main Content|Important Details|Takeaways)\*\*/g, '## $1');
  
  // Ensure proper spacing around headers
  converted = converted.replace(/\n+(##[^\n]*)\n*/g, '\n\n$1\n');
  
  // Clean up bullet points formatting
  converted = converted.replace(/^[\s]*•\s*/gm, '- ');
  
  // Clean up multiple newlines
  converted = converted.replace(/\n{3,}/g, '\n\n');
  
  return converted.trim();
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
        inputs: `Create a comprehensive, professional summary of this content. Structure it exactly as shown:

## Overview
[2-3 sentences explaining what this content covers and its significance]

## Key Points
- [Most important concept or finding #1]
- [Most important concept or finding #2] 
- [Most important concept or finding #3]
- [Most important concept or finding #4]

## Main Content
[2-3 paragraphs explaining the core ideas, arguments, evidence, and main themes in detail. Include specific details, examples, or data when available.]

## Supporting Evidence
- [Specific facts, data, or examples mentioned]
- [Research findings or expert opinions cited]
- [Case studies or real-world applications]

## Key Takeaways
- [Actionable insight or lesson #1]
- [Actionable insight or lesson #2] 
- [Most important conclusion for readers]

## Summary
[1-2 sentences that capture the essence and practical value of this content]

Content to summarize: "${initialSummary.summary_text}"

Professional summary:`,
        parameters: {
          max_new_tokens: 1200,
          temperature: 0.1,
          do_sample: true,
          return_full_text: false,
        }
      });

      let summary = enhancedSummary.generated_text;
      
      if (!summary || summary.length < 200) {
        summary = formatBasicSummary(initialSummary.summary_text, url);
      } else {
        // Clean up and format the response
        summary = summary.trim();
        
        // Remove any response prefixes
        const prefixes = [
          'Structured summary:', 'Professional summary:', 'Summary:', 
          'Here is the summary:', 'The summary is:', 'Based on the content:'
        ];
        
        for (const prefix of prefixes) {
          if (summary.toLowerCase().startsWith(prefix.toLowerCase())) {
            summary = summary.substring(prefix.length).trim();
          }
        }
        
        // Ensure proper markdown formatting
        summary = convertToMarkdownSummary(summary);
        
        // If the AI response is still not good enough, use enhanced fallback
        if (summary.length < 300 || !summary.includes('##')) {
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
