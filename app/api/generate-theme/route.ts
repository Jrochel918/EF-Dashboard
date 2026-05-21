import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  const body = await request.json();
  const { answers } = body as { answers: Record<string, string> };

  const prompt = `You are a creative designer helping personalize a student dashboard. Based on the student's interests and personality below, generate a visual theme for their dashboard.

Student profile:
${Object.entries(answers).map(([q, a]) => `- ${q}: ${a}`).join('\n')}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "bgColor": "#hexcode",
  "cardBg": "#hexcode",
  "textAccent": "#hexcode",
  "tagline": "a short personalized motivational phrase for this student (under 10 words)",
  "vibe": "2-3 words describing the aesthetic (e.g. 'calm ocean vibes', 'bold urban energy', 'cozy bookshop warmth')"
}

Guidelines:
- primaryColor: main accent color for buttons, active tabs, avatar (must be readable on white)
- secondaryColor: softer complementary accent
- bgColor: page background (should be light, low-saturation — like #f5f3ff or #f0f9ff)
- cardBg: card background (white or very slightly tinted, e.g. #ffffff or #fefcfb)
- textAccent: color for secondary text accents (must be readable)
- Make the palette cohesive and reflect the student's personality
- Avoid pure black (#000000) or pure white (#ffffff) for primaryColor`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return Response.json({ error: 'No response from AI' }, { status: 500 });
  }

  try {
    const theme = JSON.parse(textBlock.text.trim());
    return Response.json({ theme });
  } catch {
    return Response.json({ error: 'Failed to parse theme', raw: textBlock.text }, { status: 500 });
  }
}
