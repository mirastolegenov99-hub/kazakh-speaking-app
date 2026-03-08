# Kazakh Speaking Chatbot

A WhatsApp-style chatbot that speaks Kazakh using AI + ElevenLabs TTS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your API keys to `.env`:
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id
```

- Get an OpenAI key at https://platform.openai.com
- Get an ElevenLabs key at https://elevenlabs.io (Profile > API Key)
- For voice ID: go to ElevenLabs Voices, pick one that supports Kazakh, copy its ID

3. Run the app:
```bash
# Terminal 1 - backend
npm run server

# Terminal 2 - frontend  
npm run dev
```

4. Open http://localhost:5173

## How it works

- You type a message (in Kazakh, English, or any language)
- The AI responds in Kazakh (powered by GPT-4o-mini)
- The response is converted to speech via ElevenLabs (multilingual v2 model)
- Audio plays inline as a WhatsApp-style voice message
