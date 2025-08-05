import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { rateLimit, validateUrl, sanitizeContent } from '../../utils/security';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    // Remove unwanted elements more thoroughly
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .comments, .sidebar, .menu, .navigation, .popup, .modal, iframe, noscript').remove();
    
    // Try to find the main content using common selectors
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
    
    // Fallback to body if no specific content area found
    if (!content) {
      content = $('body').text().trim();
    }
    
    // Clean up the content
    content = sanitizeContent(content);
    
    // More intelligent content length limiting
    const maxLength = 12000; // Increased for better context
    if (content.length > maxLength) {
      // Try to cut at sentence boundaries
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
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
    }
    
    // Scrape the article content
    const articleContent = await scrapeArticle(url);
    
    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert article summarizer who creates comprehensive, well-structured summaries with excellent visual hierarchy. Your summaries must be formatted for optimal readability and scannability.

CRITICAL FORMATTING REQUIREMENTS:
1. Always start with a brief overview paragraph (no header)
2. Use ## for major section headers
3. Use - bullets for key points within sections
4. Use **bold** for important terms and concepts
5. Include proper spacing between sections

MANDATORY STRUCTURE - Follow this exact format:
1. Overview paragraph (2-3 sentences summarizing the core topic)
2. ## Key Points (3-5 main insights as bullet points)
3. ## Main Content (detailed explanation in 2-3 paragraphs)
4. ## Important Details (specific facts, data, examples as bullets)
5. ## Takeaways (2-3 conclusion points as bullets)

CONTENT GUIDELINES:
- Overview: What is this article about and why does it matter?
- Key Points: Most important insights that readers need to know
- Main Content: Detailed explanation of core concepts and arguments
- Important Details: Specific information like data, examples, quotes, methods
- Takeaways: Actionable insights and conclusions for the reader

FORMATTING STANDARDS:
- Use **bold** for important terms, names, and key concepts
- Use - bullets for lists and key points
- Keep paragraphs concise (2-4 sentences max)
- Ensure logical flow between sections
- Include specific details and examples when available

EXAMPLE FORMAT:
This article explores the impact of sustainable web development on business performance. The author demonstrates how implementing green coding practices can reduce operational costs while improving user experience.

## Key Points
- Sustainable development reduces server costs by up to 30%
- **Performance optimization** directly correlates with user satisfaction
- Green hosting providers offer competitive pricing with environmental benefits
- Code efficiency improvements lead to faster load times

## Main Content
The article presents evidence that sustainable web development practices create a win-win scenario for businesses and the environment. Companies implementing these practices report significant cost savings through reduced server usage and improved efficiency.

The author emphasizes that modern web development must consider environmental impact as a core requirement, not an optional feature. This shift in perspective leads to better code quality and more thoughtful resource management.

## Important Details
- **Case study**: Company X reduced hosting costs by 35% through code optimization
- Average page load time improved from 3.2s to 1.8s
- Carbon footprint decreased by 40% with green hosting migration
- User engagement increased by 25% after performance improvements

## Takeaways
- Implementing sustainable practices provides immediate cost benefits
- Environmental responsibility aligns with improved user experience
- Green hosting solutions are now cost-competitive with traditional options`
        },
        {
          role: "user",
          content: `Create a comprehensive, well-structured summary of the following article. Follow the mandatory structure and formatting guidelines precisely.

IMPORTANT:
- Start with a clear overview paragraph
- Use the exact section headers: ## Key Points, ## Main Content, ## Important Details, ## Takeaways
- Apply proper formatting with **bold** for key terms and - bullets for lists
- Include specific details, data, and examples when available
- Make it scannable and actionable

Article content:

${articleContent}`
        }
      ],
      max_tokens: 1200, // Increased for more detailed content
      temperature: 0.2, // Lower for more consistent structure
      presence_penalty: 0.1,
      frequency_penalty: 0.2,
      top_p: 0.9
    });
    
    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }
    
    // Validate and enhance summary structure
    const validateSummaryStructure = (content: string) => {
      const requiredSections = [
        '## Key Points',
        '## Main Content', 
        '## Important Details',
        '## Takeaways'
      ];
      
      const validation = {
        hasOverview: !content.trim().startsWith('##'), // Should start with overview paragraph
        hasRequiredSections: requiredSections.filter(section => content.includes(section)).length,
        hasBulletPoints: content.includes('- '),
        hasBoldFormatting: content.includes('**'),
        totalSections: (content.match(/^##\s+/gm) || []).length,
        wordCount: content.split(/\s+/).length
      };
      
      return {
        isValid: validation.hasOverview && validation.hasRequiredSections >= 3 && validation.hasBulletPoints,
        details: validation,
        score: (validation.hasRequiredSections / requiredSections.length) * 100
      };
    };
    
    const structureValidation = validateSummaryStructure(summary);
    
    // If structure validation fails, attempt basic formatting improvements
    let finalSummary = summary;
    if (!structureValidation.isValid) {
      console.warn('Summary structure validation failed, attempting improvements...');
      
      // Basic structure improvements
      if (!summary.includes('## Key Points')) {
        // Try to identify key points in the content and format them
        const lines = summary.split('\n');
        let improved = '';
        let foundFirstParagraph = false;
        
        for (const line of lines) {
          if (!foundFirstParagraph && line.trim() && !line.startsWith('#')) {
            improved += line + '\n\n## Key Points\n';
            foundFirstParagraph = true;
          } else {
            improved += line + '\n';
          }
        }
        finalSummary = improved;
      }
    }
    
    return NextResponse.json({ 
      summary: finalSummary,
      url,
      timestamp: new Date().toISOString(),
      wordCount: finalSummary.split(' ').length,
      structureValidation: {
        isValid: structureValidation.isValid,
        score: structureValidation.score,
        details: structureValidation.details
      }
    });
    
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
