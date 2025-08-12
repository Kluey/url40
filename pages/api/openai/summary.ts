import { NextApiRequest, NextApiResponse } from 'next';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.slice(0, 4000);
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

    const summaryResponse = await hf.summarization({
      model: 'facebook/bart-large-cnn',
      inputs: content,
      parameters: {
        max_length: 200,
        min_length: 50,
        do_sample: false,
      }
    });

    const summary = summaryResponse.summary_text;
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}
