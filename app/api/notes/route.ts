import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { rateLimit } from '../../utils/security';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

function formatNotes(content: string): string {
  if (!content || !content.trim()) return '';
  
  let formatted = content.trim();
  const lines = formatted.split('\n');
  const processedLines: string[] = [];
  
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
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    const lowerTrimmed = trimmed.toLowerCase();
    if (sectionMappings.has(lowerTrimmed)) {
      processedLines.push('');
      processedLines.push(sectionMappings.get(lowerTrimmed)!);
      continue;
    }
    
    if (trimmed.match(/^#{1,3}\s+/)) {
      const headerLevel = trimmed.match(/^#+/)?.[0].length || 2;
      const headerText = trimmed.replace(/^#+\s*/, '');
      const normalizedHeader = headerLevel <= 2 ? '##' : '###';
      
      processedLines.push('');
      processedLines.push(`${normalizedHeader} ${headerText}`);
      continue;
    }
    
    if (trimmed.match(/^\d+[\.\)]\s*/)) {
      const number = trimmed.match(/^(\d+)/)?.[1] || '1';
      const text = trimmed.replace(/^\d+[\.\)]\s*/, '');
      
      if (text && !text.includes('**') && !text.match(/^[a-z]/)) {
        processedLines.push(`${number}. **${text}**`);
      } else {
        processedLines.push(`${number}. ${text}`);
      }
      continue;
    }
    
    if (trimmed.match(/^\*[^*]/)) {
      const text = trimmed.substring(1).trim();
      processedLines.push(`* ${text}`);
      continue;
    }
    
    if (trimmed.match(/^[-•]\s*/)) {
      const text = trimmed.replace(/^[-•]\s*/, '');
      processedLines.push(`- ${text}`);
      continue;
    }
    
    if (trimmed.match(/^\s+[-•*]\s*/)) {
      const text = trimmed.replace(/^[-•*]\s*/, '');
      processedLines.push(`   - ${text}`);
      continue;
    }
    
    if (i > 0 && trimmed && !trimmed.match(/^[#\d*-]/) && !trimmed.includes('##')) {
      const prevLine = processedLines[processedLines.length - 1];
      if (prevLine && prevLine.match(/^\d+\./)) {
        processedLines.push(`   - ${trimmed}`);
        continue;
      }
    }
    
    processedLines.push(trimmed);
  }
  
  formatted = processedLines.join('\n');
  
  formatted = formatted.replace(/\n+(##[^\n]*)\n*/g, '\n\n$1\n');
  
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  formatted = formatted.trim();
  
  if (formatted && !formatted.endsWith('\n')) {
    formatted += '\n';
  }
  
  return formatted;
}

function generateLocalNotes(summaryText: string): string {
  const sentences = summaryText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const lines = summaryText.split('\n').filter(l => l.trim().length > 5);
  
  let notes = '## Key Takeaways\n';
  
  const keyPoints: string[] = [];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.includes('important') || trimmed.includes('key') || 
        trimmed.includes('significant') || trimmed.includes('main') ||
        trimmed.includes('critical') || trimmed.includes('essential')) {
      keyPoints.push(trimmed);
    }
  });
  
  if (keyPoints.length > 0) {
    keyPoints.slice(0, 3).forEach(point => {
      notes += `* ${point}\n`;
    });
  } else {
    sentences.slice(0, 3).forEach(sentence => {
      notes += `* ${sentence.trim()}\n`;
    });
  }
  
  notes += '\n## Main Points\n';
  
  const mainPoints = lines.filter(line => line.length > 30).slice(0, 4);
  mainPoints.forEach((point, index) => {
    const cleanPoint = point.replace(/^[#*-]\s*/, '').trim();
    notes += `${index + 1}. **${cleanPoint.split('.')[0]}**\n`;
    if (cleanPoint.includes('.')) {
      notes += `   - ${cleanPoint.split('.').slice(1).join('.').trim()}\n`;
    }
  });
  
  notes += '\n## Supporting Details\n';
  
  const supportingLines = sentences.filter(s => 
    s.includes('data') || s.includes('study') || s.includes('research') ||
    s.includes('example') || s.includes('case') || s.includes('percent') ||
    s.includes('%') || s.includes('statistics')
  ).slice(0, 3);
  
  if (supportingLines.length > 0) {
    supportingLines.forEach(line => {
      notes += `- ${line.trim()}\n`;
    });
  } else {
    notes += '- Detailed information available in the original content\n';
    notes += '- Additional context and examples provided in source material\n';
  }
  
  notes += '\n## Action Items\n';
  notes += '- Review the complete source material for comprehensive understanding\n';
  notes += '- Consider practical applications of the key concepts discussed\n';
  notes += '- Follow up on specific areas of interest mentioned in the content\n';
  
  notes += '\n## Summary\n';
  notes += '* These notes were generated using local processing methods\n';
  notes += '* Key insights extracted from the provided summary content\n';
  
  return notes;
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
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 });
    }
    

    try {

      const prompt = `Create detailed, well-structured notes from this summary. Format as markdown with clear sections:

Summary: ${summaryText}

Structured Notes:
## Key Takeaways
* 
## Main Points
1. **
## Supporting Details
- 
## Action Items
- 
## Summary
* `;

      const completion = await hf.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
          do_sample: true,
          return_full_text: false,
          stop: ['\n\n---', '\n\nNote:', '\n\nDisclaimer:'],
        }
      });

      let result = completion.generated_text?.trim();

      if (!result || result.length < 50) {

        result = generateLocalNotes(summaryText);
      }


      result = formatNotes(result);


      if (!result.includes('## Key Takeaways')) {
        result = generateLocalNotes(summaryText);
      }

      return NextResponse.json({ 
        result,
        timestamp: new Date().toISOString(),
        wordCount: result.split(' ').length,
        model: 'microsoft/DialoGPT-medium'
      });

    } catch (hfError) {
      console.error('Hugging Face error:', hfError);
      

      const localNotes = generateLocalNotes(summaryText);
      
      return NextResponse.json({ 
        result: localNotes,
        timestamp: new Date().toISOString(),
        wordCount: localNotes.split(' ').length,
        model: 'local-processing'
      });
    }
    
  } catch (error) {
    console.error('Error in notes API:', error);
    
    if (error instanceof Error) {

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Service is currently busy. Please try again in a moment.' },
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
