import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { summary } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates well-structured bullet point notes. Format your response as clear, concise bullet points using • symbols. Focus on key takeaways and actionable information.'
        },
        {
          role: 'user',
          content: `Create structured bullet point notes from this summary:\n\n${summary}`
        }
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    const notes = response.choices[0]?.message?.content?.trim();
    res.status(200).json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}
