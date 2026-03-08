import { useState, useRef, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function AudioMessage({ audioUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars] = useState(() =>
    Array.from({ length: 28 }, () => Math.random() * 60 + 40)
  );

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-msg">
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        onTimeUpdate={() => setProgress(audioRef.current.currentTime)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button className="play-btn" onClick={toggle}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>
      <div className="audio-track">
        <div className="waveform">
          {bars.map((h, i) => {
            const pct = duration ? progress / duration : 0;
            const active = i / bars.length < pct;
            return (
              <div
                key={i}
                className={`bar ${active ? 'active' : ''}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>
      <span className="audio-time">{fmt(duration > 0 ? duration - progress : 0)}</span>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`bubble-row ${isUser ? 'right' : 'left'}`}>
      <div className={`bubble ${isUser ? 'user' : 'bot'}`}>
        <p className="bubble-text">{message.content}</p>
        {message.audioUrl && <AudioMessage audioUrl={message.audioUrl} />}
        <span className="bubble-time">{message.time}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Сәлем! Привет! Қазақша немесе орысша жаза аласыз — екеуінде де сөйлесемін!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioUrl: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, time: now(), audioUrl: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const chatRes = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      });
      const { reply } = await chatRes.json();

      let audioUrl = null;
      try {
        const ttsRes = await fetch(`${API_URL}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: reply }),
        });
        if (ttsRes.ok) {
          const blob = await ttsRes.blob();
          audioUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        console.warn('TTS unavailable:', e);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, time: now(), audioUrl },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Кешіріңіз, қате орын алды. Қайта жазып көріңіз.',
          time: now(),
          audioUrl: null,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="app">
      <header>
        <div className="avatar">🇰🇿</div>
        <div className="header-info">
          <h1>Қазақша Бот</h1>
          <span className="status">online</span>
        </div>
      </header>

      <main>
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="bubble-row left">
            <div className="bubble bot typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer>
        <input
          ref={inputRef}
          type="text"
          placeholder="Хабарлама жазыңыз..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
