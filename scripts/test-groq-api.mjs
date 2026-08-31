const apiKey = (process.env.GROQ_API_KEY || '').trim();
if (!apiKey) throw new Error('GROQ_API_KEY_REQUIRED');

const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'Reply exactly: SOUL_GROQ_API_OK' }],
    temperature: 0,
    max_completion_tokens: 16,
  }),
});
if (!response.ok) throw new Error(`GROQ_API_${response.status}`);
const body = await response.json();
const text = body?.choices?.[0]?.message?.content?.trim() || '';
if (!text.includes('SOUL_GROQ_API_OK')) throw new Error('GROQ_API_UNEXPECTED_RESPONSE');
console.log('N05 Groq API: OK');
