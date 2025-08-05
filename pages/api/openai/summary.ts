import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Basic text extraction (you might want to use a proper HTML parser)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.slice(0, 4000); // Limit content length
  } catch (error) {
    console.error('Error fetching web content:', error);
    return '';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Fetch the actual content from the URL
    const content = await fetchWebContent(url);
    
    if (!content) {
      return res.status(400).json({ error: 'Unable to fetch content from URL' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, informative summaries of web content. Focus on the main points and key information.'
        },
        {
          role: 'user',
          content: `Please provide a clear and concise summary of the following web content from ${url}:\n\n${content}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}
