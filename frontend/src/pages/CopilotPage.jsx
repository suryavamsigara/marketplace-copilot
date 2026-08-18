import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Cpu,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  AlertCircle,
  HelpCircle,
  Terminal,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What changed this week?',
  'Why did revenue decline?',
  'Which products need attention?',
  'Where are we at risk of stock-outs?',
  'Which marketplace is underperforming?',
  'What should I prioritize today?',
  'Show me the biggest revenue opportunities.',
  'Which products have unusual return rates?',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `## Summary
Welcome to the **Marketplace Performance Copilot**. I am your internal business intelligence and decision-support assistant.

## Capabilities
1. **Root-Cause Analysis:** Explain period-over-period revenue and conversion movements.
2. **Channel Benchmarking:** Compare Amazon, Flipkart, Myntra, and Ajio performance.
3. **Inventory Exposure:** Identify stock-out risks and excess inventory.
4. **Prioritized Action:** Recommend verified operational next steps grounded in deterministic Python analytics.

Ask any business question below or select a suggested prompt to begin.`,
      mode: 'system',
      tool_calls: [],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (userPrompt) => {
    const text = (userPrompt || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history to backend
      const history = newMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.sendCopilotChat({
        message: text,
        history,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          mode: res.mode,
          tool_calls: res.tool_calls || [],
          error: res.error,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `## Error
Unable to reach the AI Copilot reasoning service. Please check your backend connection.`,
          mode: 'error',
          error: err.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolTrace = (idx) => {
    setExpandedTools((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Helper to format structured markdown sections
  const renderMessageContent = (text) => {
    if (!text) return null;
    const sections = text.split(/(?=^##\s+)/m);

    return (
      <div className="space-y-3 text-sm text-slate-200">
        {sections.map((sec, idx) => {
          const trimmed = sec.trim();
          if (!trimmed) return null;
          const lines = trimmed.split('\n');
          const heading = lines[0].replace(/^##\s+/, '');
          const body = lines.slice(1).join('\n').trim();

          const isSummary = heading.toLowerCase().includes('summary');
          const isDrivers = heading.toLowerCase().includes('driver');
          const isEvidence = heading.toLowerCase().includes('evidence');
          const isAction = heading.toLowerCase().includes('action') || heading.toLowerCase().includes('recommend');
          const isImpact = heading.toLowerCase().includes('impact');
          const isConfidence = heading.toLowerCase().includes('confidence');
          const isCaps = heading.toLowerCase().includes('capabilit');

          let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
          if (isSummary) badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
          if (isAction) badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
          if (isImpact) badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
          if (isCaps) badgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';

          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 shadow-sm"
            >
              <div className="flex items-center space-x-2 mb-1.5">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${badgeColor}`}
                >
                  {heading}
                </span>
              </div>
              <div className="text-slate-300 leading-relaxed whitespace-pre-line text-xs pl-0.5">
                {body}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Top Banner */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>Marketplace Copilot Intelligence</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                100% Tool-Grounded
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic calculations in Python + AI synthesis. No hallucinated metrics.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: `## Summary\nSession reset. How can I help you optimize marketplace operations today?`,
                mode: 'system',
                tool_calls: [],
              },
            ])
          }
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Session</span>
        </button>
      </div>

      {/* Chat Messages Thread */}
      <div className="flex-1 glass-card rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-5">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 border border-slate-700 text-amber-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-3xl rounded-2xl p-4 space-y-3 ${
                  isUser
                    ? 'bg-amber-500/15 border border-amber-500/30 text-slate-100 text-sm font-medium'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                }`}
              >
                {isUser ? (
                  <p className="leading-relaxed">{m.content}</p>
                ) : (
                  <>
                    {/* Tool Call Trace Pill if any */}
                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                        <button
                          onClick={() => toggleToolTrace(idx)}
                          className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-400 font-mono hover:bg-slate-900/80 transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              Executed {m.tool_calls.length} deterministic analytics tool
                              {m.tool_calls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {expandedTools[idx] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedTools[idx] && (
                          <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 space-y-1.5 text-xs font-mono text-slate-400">
                            {m.tool_calls.map((tc, tIdx) => (
                              <div
                                key={tIdx}
                                className="p-2 rounded bg-slate-900 border border-slate-800/60"
                              >
                                <span className="text-amber-300 font-bold block">
                                  ⚡ {tc.tool}()
                                </span>
                                {tc.args && Object.keys(tc.args).length > 0 && (
                                  <span className="text-slate-400 text-[10px]">
                                    Args: {JSON.stringify(tc.args)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Render Formatted Markdown */}
                    {renderMessageContent(m.content)}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2 max-w-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
                <span className="text-xs font-semibold text-slate-300 ml-1">
                  Querying analytics tools & synthesizing answer...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Suggested Business Inquiries
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-300 transition text-xs font-medium disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Box */}
      <div className="glass-card rounded-2xl p-2.5 border border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          placeholder="Ask anything about marketplace sales, inventory risk, return anomalies..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-3 py-1.5 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
