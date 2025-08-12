import { NextApiRequest, NextApiResponse } from 'next';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { summary } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  try {
    const prompt = `Convert this summary into structured bullet point notes with clear formatting:

Summary: ${summary}

Notes:
• Key point 1
• Key point 2
• Key point 3

Structured Notes:`;

    const response = await hf.textGeneration({
      model: 'microsoft/DialoGPT-medium',
      inputs: prompt,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.2,
        do_sample: true,
        return_full_text: false,
      }
    });

    let notes = response.generated_text?.trim();
    
    if (!notes || notes.length < 20) {
      const sentences = summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
      notes = sentences.slice(0, 5).map((sentence: string) => `• ${sentence.trim()}`).join('\n');
    }

    res.status(200).json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}
