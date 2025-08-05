import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rateLimit } from '../../utils/security';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to ensure proper formatting of generated notes
function formatNotes(content: string): string {
  if (!content || !content.trim()) return '';
  
  let formatted = content.trim();
  const lines = formatted.split('\n');
  const processedLines: string[] = [];
  
  // Section header mappings for standardization
  const sectionMappings = new Map([
    ['key takeaways', '## Key Takeaways'],
    ['key takeaway', '## Key Takeaways'],
    ['main points', '## Main Points'],
    ['main point', '## Main Points'],
    ['supporting details', '## Supporting Details'],
    ['supporting detail', '## Supporting Details'],
    ['action items', '## Action Items'],
    ['action item', '## Action Items'],
    ['additional notes', '## Additional Notes'],
    ['additional note', '## Additional Notes'],
    ['summary', '## Summary'],
    ['summaries', '## Summary'],
    ['conclusion', '## Summary'],
    ['conclusions', '## Summary']
  ]);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Skip completely empty lines (will be added back strategically)
    if (!trimmed) continue;
    
    // Normalize section headers
    const lowerTrimmed = trimmed.toLowerCase();
    if (sectionMappings.has(lowerTrimmed)) {
      processedLines.push(''); // Add spacing before section
      processedLines.push(sectionMappings.get(lowerTrimmed)!);
      continue;
    }
    
    // Ensure proper header formatting for ## and ### headers
    if (trimmed.match(/^#{1,3}\s+/)) {
      const headerLevel = trimmed.match(/^#+/)?.[0].length || 2;
      const headerText = trimmed.replace(/^#+\s*/, '');
      const normalizedHeader = headerLevel <= 2 ? '##' : '###';
      
      processedLines.push(''); // Add spacing before header
      processedLines.push(`${normalizedHeader} ${headerText}`);
      continue;
    }
    
    // Fix numbered list formatting
    if (trimmed.match(/^\d+[\.\)]\s*/)) {
      const number = trimmed.match(/^(\d+)/)?.[1] || '1';
      const text = trimmed.replace(/^\d+[\.\)]\s*/, '');
      
      // If the text doesn't have bold formatting but should, add it
      if (text && !text.includes('**') && !text.match(/^[a-z]/)) {
        processedLines.push(`${number}. **${text}**`);
      } else {
        processedLines.push(`${number}. ${text}`);
      }
      continue;
    }
    
    // Fix bullet point formatting (asterisks for highlights)
    if (trimmed.match(/^\*[^*]/)) {
      const text = trimmed.substring(1).trim();
      processedLines.push(`* ${text}`);
      continue;
    }
    
    // Fix regular bullet points
    if (trimmed.match(/^[-•]\s*/)) {
      const text = trimmed.replace(/^[-•]\s*/, '');
      processedLines.push(`- ${text}`);
      continue;
    }
    
    // Handle indented sub-bullets (preserve indentation but standardize format)
    if (trimmed.match(/^\s+[-•*]\s*/)) {
      const indentation = line.match(/^(\s*)/)?.[1] || '   ';
      const text = trimmed.replace(/^[-•*]\s*/, '');
      // Standardize to 3 spaces for sub-bullets
      processedLines.push(`   - ${text}`);
      continue;
    }
    
    // Handle content that should become sub-bullets under numbered items
    if (i > 0 && trimmed && !trimmed.match(/^[#\d*-]/) && !trimmed.includes('##')) {
      const prevLine = processedLines[processedLines.length - 1];
      if (prevLine && prevLine.match(/^\d+\./)) {
        processedLines.push(`   - ${trimmed}`);
        continue;
      }
    }
    
    // Regular content - preserve as is
    processedLines.push(trimmed);
  }
  
  // Join lines and clean up spacing
  formatted = processedLines.join('\n');
  
  // Ensure proper spacing around section headers
  formatted = formatted.replace(/\n+(##[^\n]*)\n*/g, '\n\n$1\n');
  
  // Clean up multiple consecutive newlines (max 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Ensure content starts and ends clean
  formatted = formatted.trim();
  
  // Add final newline for better formatting
  if (formatted && !formatted.endsWith('\n')) {
    formatted += '\n';
  }
  
  return formatted;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!rateLimit(ip, 10, 60000)) { // 10 requests per minute
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const { summary } = await request.json();
    
    if (!summary) {
      return NextResponse.json({ error: 'Summary is required' }, { status: 400 });
    }
    
    // Validate summary content
    const summaryText = typeof summary === 'string' ? summary.trim() : '';
    if (summaryText.length < 20) {
      return NextResponse.json({ 
        error: 'Summary too short. Please provide at least 20 characters of content.' 
      }, { status: 400 });
    }
    
    if (summaryText.length > 10000) {
      return NextResponse.json({ 
        error: 'Summary too long. Please limit to 10,000 characters.' 
      }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
    }
    
    // Generate structured notes using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert note-taker specializing in creating highly structured, scannable, and actionable notes. Your notes must be perfectly formatted for visual hierarchy and easy comprehension.

CRITICAL FORMATTING REQUIREMENTS:
1. Use ## for ALL section headers (e.g., "## Key Takeaways")
2. Use numbered lists (1. 2. 3.) with **bold titles** for main concepts
3. Use - bullets for general information and context
4. Use * bullets ONLY for key highlights and critical insights
5. Use   - (3 spaces + dash) for sub-bullets under numbered items
6. Include blank lines between major sections
7. Keep content concise but comprehensive

MANDATORY STRUCTURE - Follow this exact order:
1. ## Key Takeaways (3-5 critical insights using * bullets)
2. ## Main Points (numbered list with **bold titles** and sub-bullets)
3. ## Supporting Details (contextual information using - bullets)
4. ## Action Items (specific next steps using - bullets)
5. ## Summary (2-3 final insights using * bullets)

CONTENT GUIDELINES:
- Key Takeaways: Most important insights that answer "what matters most?"
- Main Points: Core concepts organized logically with supporting details
- Supporting Details: Background context, data, examples, explanations
- Action Items: Specific, actionable steps the reader can take
- Summary: Final thoughts and key reminders for future reference

QUALITY STANDARDS:
- Each bullet point should be self-contained and meaningful
- Use specific, concrete language rather than vague statements
- Prioritize actionable insights over theoretical concepts
- Maintain consistent formatting throughout
- Ensure logical flow between sections

EXAMPLE FORMAT:
## Key Takeaways
* Most critical insight that drives immediate value
* Second essential point with specific details
* Third key insight for practical application

## Main Points
1. **Primary Concept Name**
   - Supporting detail with context
   - Additional relevant information

2. **Secondary Important Area**
   - Key information and specifics
   - Related supporting evidence

## Supporting Details
- Contextual background information
- Relevant data points or statistics
- Additional explanatory content

## Action Items
- Specific next step to implement
- Another concrete action to take
- Follow-up research or task

## Summary
* Essential insight for long-term reference
* Key reminder for future application`
        },
        {
          role: "user",
          content: `Create comprehensive, perfectly structured notes from this content. Follow the mandatory structure and formatting guidelines precisely.

IMPORTANT: 
- Ensure each section has meaningful content
- Use the exact header format: ## Section Name
- Apply proper bullet formatting as specified
- Include blank lines between sections
- Make content actionable and specific

Content to process:

${summaryText}`
        }
      ],
      max_tokens: 2000, // Increased for more comprehensive notes
      temperature: 0.2, // Slightly higher for more natural language while maintaining structure
      presence_penalty: 0.1,
      frequency_penalty: 0.3, // Reduced repetition
      top_p: 0.9, // Added for better quality control
    });
    
    let result = completion.choices[0]?.message?.content?.trim();
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 });
    }
    
    // Ensure minimum content length and quality
    if (result.length < 100) {
      return NextResponse.json({ 
        error: 'Generated content too short. Please provide more detailed input.' 
      }, { status: 400 });
    }
    
    // Post-process to ensure proper formatting
    result = formatNotes(result);
    
    // Comprehensive validation of the generated notes
    const validateNotesFormat = (content: string) => {
      const requiredSections = [
        '## Key Takeaways',
        '## Main Points', 
        '## Supporting Details',
        '## Action Items',
        '## Summary'
      ];
      
      const validation = {
        hasAllSections: requiredSections.every(section => content.includes(section)),
        hasKeyTakeaways: content.includes('* ') && content.includes('## Key Takeaways'),
        hasNumberedPoints: /^\d+\.\s+\*\*/m.test(content),
        hasSubBullets: content.includes('   -'),
        hasProperSpacing: content.includes('\n\n##'),
        sectionCount: (content.match(/^##\s+/gm) || []).length,
        wordCount: content.split(/\s+/).length
      };
      
      return {
        isValid: validation.hasAllSections && validation.hasKeyTakeaways && validation.sectionCount >= 4,
        details: validation
      };
    };
    
    const formatValidation = validateNotesFormat(result);
    
    // If format validation fails, attempt one more formatting pass
    if (!formatValidation.isValid) {
      console.warn('Initial format validation failed, attempting recovery...');
      
      // Add missing sections if they're completely absent
      if (!result.includes('## Key Takeaways')) {
        result = '## Key Takeaways\n* Key insight from the content\n\n' + result;
      }
      if (!result.includes('## Summary')) {
        result = result + '\n\n## Summary\n* Important points to remember';
      }
      
      // Re-run formatting
      result = formatNotes(result);
    }
    
    const finalValidation = validateNotesFormat(result);
    
    return NextResponse.json({ 
      result,
      timestamp: new Date().toISOString(),
      wordCount: result.split(' ').length,
      hasProperFormatting: finalValidation.isValid,
      formatDetails: finalValidation.details
    });
    
  } catch (error) {
    console.error('Error in notes API:', error);
    
    if (error instanceof Error) {
      // Handle OpenAI-specific errors
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service is currently busy. Please try again in a moment.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('content filter') || error.message.includes('safety')) {
        return NextResponse.json(
          { error: 'Content cannot be processed due to safety guidelines.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate notes. Please try again.' },
      { status: 500 }
    );
  }
}
