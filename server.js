import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a friendly bilingual chatbot for people in Kazakhstan. You speak both Kazakh and Russian fluently.
Rules:
- If the user writes in Kazakh, respond in Kazakh (Cyrillic script).
- If the user writes in Russian, respond in Russian.
- If the user writes in English or another language, respond in Russian.
- You can naturally mix Kazakh and Russian the way people in Kazakhstan actually talk day-to-day.
- Keep responses concise — 1-3 sentences max, like a WhatsApp message.
- Be warm, natural, and conversational.`;

// Helper: make HTTPS POST request (no fetch needed)
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ status: res.statusCode, headers: res.headers, buffer });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const result = await httpsPost(
      'api.openai.com',
      '/v1/chat/completions',
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 200,
      }
    );

    const raw = result.buffer.toString();
    console.log('OpenAI status:', result.status);
    console.log('OpenAI response:', raw.substring(0, 500));

    const json = JSON.parse(raw);
    if (result.status !== 200) {
      console.error('OpenAI error:', json);
      return res.status(500).json({ error: json.error?.message || 'Chat failed' });
    }

    const reply = json.choices[0].message.content;
    console.log('Reply:', reply);
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// TTS endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

    const result = await httpsPost(
      'api.elevenlabs.io',
      `/v1/text-to-speech/${voiceId}`,
      {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      {
        text,
        model_id: 'eleven_v3',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }
    );

    if (result.status !== 200) {
      console.error('ElevenLabs error:', result.buffer.toString());
      return res.status(500).json({ error: 'TTS failed' });
    }

    res.set('Content-Type', 'audio/mpeg');
    res.send(result.buffer);
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
