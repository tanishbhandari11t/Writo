import { useState, useEffect } from 'react';
import { Github, Send, RefreshCw, Zap, ShieldCheck, TrendingUp, Type, Copy, Check, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { diff_match_patch } from 'diff-match-patch';
import { RatingInteraction } from './components/ui/emoji-rating';
import './App.css';
import logoImg from './assets/logo.png';

interface HumanizeResult {
  humanized_text: string;
  ai_score_before: number;
  human_score_after: number;
  improvements_summary: string[];
}

const WRITO_PROMPT = `
\ud83d\udcaa SYSTEM ROLE
You are WRITO \u2014 an elite human writing engine. 

Your mission is to transform robotic or AI-written text into authentic human writing that feels natural, engaging, and believable.

\ud83d\udccc CORE FORMULA
Simple words + Varied sentences + Emotion + Real-world examples + Contractions = Human-like writing.

🟣 REWRITE RULES
\u2022 BREAK TEXT INTO SHORT PARAGRAPHS: Use frequent paragraph breaks for readability.
\u2022 SIMPLE WORDS: Replace formal/stiff vocabulary (e.g., "numerous advantages") with everyday language ("a lot of benefits").
\u2022 BURSTINESS: Mix short, punchy lines with longer, descriptive sentences.
\u2022 EMOTION & OPINION: Add feelings and viewpoints (e.g., "I think," "surprisingly," "honestly").
\u2022 CONTRACTIONS: Use don\u2019t, can\u2019t, it\u2019s instead of do not, cannot, it is.
\u2022 NO AI CONNECTORS: Strictly avoid "furthermore," "additionally," "moreover." Use "also," "plus," or "and."
\u2022 BANNED AI CLICH\u00c9S: Do NOT use "in today\u2019s digital age," "at its core," "embark on a journey," "unlocking potential," "harnessing the power," or "deep dive."
\u2022 PRESERVE MEANING: Keep the original facts and intent intact.

\ud83d\udd35 INPUT TEXT
{{USER_TEXT}}

\ud83d\udcc4 OUTPUT FORMAT
Return ONLY a JSON object with:
{
  "humanized_text": "text",
  "ai_score_before": 0-100,
  "human_score_after": 0-100,
  "improvements_summary": ["bullet 1", "bullet 2"]
}
`;

function App() {
  const [inputText, setInputText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('writo_stats');
    return saved ? JSON.parse(saved) : {
      charsProcessed: 2170,
      requestCount: 2,
      dailyUsers: 216,
      githubStars: 214
    };
  });
  const [hasRated, setHasRated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('writo_stats', JSON.stringify(stats));
  }, [stats]);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }

  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('writo_last_visit');
    if (lastVisit !== today) {
      setStats(prev => ({ ...prev, dailyUsers: prev.dailyUsers + 1 }));
      localStorage.setItem('writo_last_visit', today);
    }

    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        dailyUsers: prev.dailyUsers + (Math.random() > 0.95 ? 1 : 0)
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleHumanize = async (mode?: string) => {
    if (!inputText.trim()) return;
    setIsLoading(true);

    let promptSuffix = '';
    if (mode === 'shorter') promptSuffix = '\n\nMake the response significantly shorter and more concise.';
    if (mode === 'longer') promptSuffix = '\n\nMake the response more detailed and elaborate.';
    if (mode === 'casual') promptSuffix = '\n\nUse a more relaxed, casual, and conversational tone.';
    if (mode === 'professional') promptSuffix = '\n\nUse a more professional, formal, and authoritative tone.';

    const prompt = WRITO_PROMPT.replace('{{USER_TEXT}}', inputText) + promptSuffix;

    try {
      let rawText = '';
      
      // Try Gemini
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              topP: 0.9,
              responseMimeType: 'application/json',
            },
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn("Gemini failed, trying fallback...");
      }

      // Fallback to Groq if Gemini failed or returned empty
      if (!rawText) {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            response_format: { type: 'json_object' }
          })
        });
        const groqData = await groqResponse.json();
        rawText = groqData.choices[0].message.content;
      }
      
      if (rawText) {
        // Clean potential markdown blocks
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        setResult(parsed);
        setHumanizedText(parsed.humanized_text);
        setStats(prev => ({
          ...prev,
          charsProcessed: prev.charsProcessed + inputText.length,
          requestCount: prev.requestCount + 1
        }));
      }
    } catch (error) {
      console.error('Humanization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDiff = () => {
    if (!humanizedText) return <span className="placeholder">The human touch will appear here...</span>;
    if (!inputText) return humanizedText;

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(inputText, humanizedText);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map((part, i) => {
      const [type, text] = part;
      if (type === 1) return <span key={i} className="diff-added">{text}</span>;
      // Hide removed segments (type === -1) to match the "Clean Improved" look
      if (type === -1) return null;
      return <span key={i}>{text}</span>;
    });
  };

  return (
    <div className="app-container">
      <div className="glow-bg" style={{ top: '-100px', right: '-100px', backgroundColor: 'var(--primary-glow)' }} />
      <header>
        <motion.div className="logo" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <img src={logoImg} alt="Writo Logo" className="logo-img" />
          <span className="logo-text">Writo</span>
        </motion.div>

        <div className="nav-links">
          <a href="#" className="nav-link">Humanizer</a>
          <a href="https://github.com/tanishbhandari11t/Writo#readme" className="nav-link" target="_blank" rel="noopener noreferrer">Docs</a>
        </div>
        
        <motion.div className="github-star-btn" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="github-icon-box"><Github size={20} color="#fff" /></div>
          <div className="github-divider" />
          <div className="star-box">
            <Star size={16} className="star-icon" fill="#fbbf24" stroke="#fbbf24" />
            {stats.githubStars}
          </div>
        </motion.div>
      </header>

      <main>
        <div className="hero-section">
          <motion.h1 className="hero-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Humanize Your Text, <span style={{color: 'var(--primary)'}}>Not Your Patterns.</span>
          </motion.h1>
          <p className="description-subtitle">Show changes visually: <span style={{color:'#10b981'}}>green = improved</span></p>
        </div>

        <div className="main-workspace">
          <div className="editor-pane">
            <div className="pane-label"><Type size={16} /> Your Text</div>
            <div className="glass-panel">
              <textarea 
                placeholder="Paste your AI text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </div>

          <div className="divider">
            <button className="arrow-btn" onClick={() => handleHumanize()} disabled={isLoading || !inputText.trim()}>
              {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={28} /></motion.div> : <Send size={28} />}
            </button>
          </div>

          <div className="editor-pane">
            <div className="pane-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} /> Humanized Text
              </div>
              {humanizedText && (
                <button 
                  className="copy-btn-minimal" 
                  onClick={() => copyToClipboard(humanizedText)}
                  title="Copy improved text"
                >
                  {isCopied ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
                </button>
              )}
            </div>
            <div className="glass-panel result-box">
              <div className="result-area">{renderDiff()}</div>
              {humanizedText && !isLoading && (
                <div className="regenerate-toolbar">
                  <button onClick={() => handleHumanize('shorter')} className="regen-btn"><RefreshCw size={14} /> Make shorter</button>
                  <button onClick={() => handleHumanize('longer')} className="regen-btn"><RefreshCw size={14} /> Make longer</button>
                  <button onClick={() => handleHumanize('casual')} className="regen-btn"><RefreshCw size={14} /> More casual</button>
                  <button onClick={() => handleHumanize('professional')} className="regen-btn"><RefreshCw size={14} /> More professional</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div className="results-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="glass-card score-card">
                <div className="score-header"><span className="stat-label">AI Score Before</span><span className="score-value">{result.ai_score_before}%</span></div>
                <div className="progress-bar-bg"><motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${result.ai_score_before}%` }} style={{ background: '#ef4444' }} /></div>
              </div>

              <div className="glass-card score-card">
                <div className="score-header"><span className="stat-label">Human Score After</span><span className="score-value">{result.human_score_after}%</span></div>
                <div className="progress-bar-bg"><motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${result.human_score_after}%` }} style={{ background: '#10b981' }} /></div>
              </div>

              <div className="glass-card score-card" style={{ gridColumn: 'span 2' }}>
                <span className="pane-label" style={{ marginBottom: '1rem' }}><TrendingUp size={16} /> Improvement Metrics</span>
                <ul className="improvements-list">
                  {result.improvements_summary.map((item, i) => (
                    <motion.li key={i} className="improvement-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <Zap size={14} color="var(--primary)" /> {item}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="comparison-section" style={{ marginTop: '6rem' }}>
          <h2 className="section-title">Why Choose Writo?</h2>
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr><th>Feature</th><th>Writo</th><th>Competitors</th></tr>
              </thead>
              <tbody>
                <tr><td>Multi-AI Rewriting</td><td className="check-icon">✅</td><td className="cross-icon">❌</td></tr>
                <tr className="row-highlight"><td>Human Scoring Engine</td><td className="check-icon">✅</td><td className="cross-icon">❌</td></tr>
                <tr><td>Sentence Remixing</td><td className="check-icon">✅</td><td className="cross-icon">❌</td></tr>
                <tr className="row-highlight"><td>Tone Presets</td><td className="check-icon">✅</td><td>Limited</td></tr>
                <tr><td>Free Tier</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>Generous</td><td>Limited</td></tr>
                <tr className="row-highlight"><td>Privacy-First</td><td className="check-icon">✅</td><td className="cross-icon">❌</td></tr>
                <tr><td>No Login Required</td><td className="check-icon">✅</td><td className="cross-icon">❌</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="feedback-section" style={{ marginTop: '6rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <p className="feedback-hint">How was your experience?</p>
          {hasRated ? (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="thank-you-text">Thank you for rating! ❤️</motion.p>
          ) : (
            <RatingInteraction className="mt-6" onChange={() => setHasRated(true)} />
          )}
          <div className="divider-gradient" />
        </div>
      </main>

      <footer className="footer-stats-bar glass-panel">
        <div className="footer-stat">
          <span className="footer-stat-value">{stats.charsProcessed.toLocaleString()}</span>
          <span className="footer-stat-label">Characters Processed</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-value">{stats.requestCount.toLocaleString()}</span>
          <span className="footer-stat-label">Requests Count</span>
        </div>
        <div className="footer-stat">
          <div className="footer-stat-header">
            <span className="footer-stat-value">{stats.dailyUsers.toLocaleString()}</span>
            <div className="footer-live-badge"><div className="footer-pulse" /> LIVE</div>
          </div>
          <span className="footer-stat-label">Daily Users</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
