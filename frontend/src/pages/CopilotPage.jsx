import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  TrendingDown,
  AlertTriangle,
  Package,
  Layers,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

const CATEGORIZED_PROMPTS = [
  {
    category: 'Performance & Root Cause',
    icon: TrendingDown,
    prompts: ['What changed this week?', 'Why did revenue decline?'],
  },
  {
    category: 'Inventory & Stock Risk',
    icon: Package,
    prompts: ['Where are we at risk of stock-outs?', 'Which products need attention?'],
  },
  {
    category: 'Marketplaces & Channels',
    icon: Layers,
    prompts: ['Which marketplace is underperforming?', 'Which products have unusual return rates?'],
  },
  {
    category: 'Action & Priority',
    icon: Zap,
    prompts: ['What should I prioritize today?', 'Show me the biggest revenue opportunities.'],
  },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
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
          content: `## Error\nUnable to reach the AI Copilot reasoning service. Please ensure your backend is running.`,
          mode: 'error',
          error: err.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const toggleToolTrace = (idx) => {
    setExpandedTools((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col max-w-5xl mx-auto p-4 sm:p-6 select-text">
      {/* Copilot Header Card */}
      <div className="glass-card rounded-2xl px-5 py-3.5 flex items-center justify-between border border-slate-800/80 mb-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100">Marketplace Copilot</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-medium">
                Tool Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Python calculations + AI reasoning layer
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold border border-slate-800 transition"
            title="Start new chat"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Main Chat Thread */}
      <div className="flex-1 glass-card rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-6 border border-slate-800/80">
        {/* Empty State / Welcome Screen */}
        {messages.length === 0 && (
          <div className="py-6 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-lg shadow-amber-500/5">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-100 tracking-tight">
                How can I assist your marketplace operations today?
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Ask any business inquiry. Responses are synthesized directly from database metrics and deterministic Python tool outputs.
              </p>
            </div>

            {/* Categorized Starter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {CATEGORIZED_PROMPTS.map((cat, cIdx) => {
                const CatIcon = cat.icon;
                return (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                      <CatIcon className="w-4 h-4 text-amber-400" />
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-1.5">
                      {cat.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSend(p)}
                          className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800/60 hover:border-amber-500/30 text-xs text-slate-300 hover:text-amber-200 transition flex items-center justify-between group"
                        >
                          <span className="truncate pr-2">{p}</span>
                          <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition text-[11px] font-mono">
                            ↵
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3.5 ${
                isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
              } animate-in fade-in duration-200`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 border border-slate-700/80 text-amber-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-3xl rounded-2xl p-4 sm:p-5 space-y-3 ${
                  isUser
                    ? 'bg-amber-500/15 border border-amber-500/30 text-slate-100 text-sm font-medium'
                    : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 shadow-lg shadow-black/20'
                }`}
              >
                {isUser ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <>
                    {/* Tool Call Trace Drawer */}
                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 mb-3">
                        <button
                          onClick={() => toggleToolTrace(idx)}
                          className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-amber-300 font-mono hover:bg-slate-900 transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              Executed {m.tool_calls.length} deterministic analytics tool
                              {m.tool_calls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {expandedTools[idx] ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {expandedTools[idx] && (
                          <div className="p-3 bg-slate-950 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
                            {m.tool_calls.map((tc, tIdx) => (
                              <div
                                key={tIdx}
                                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800"
                              >
                                <span className="text-amber-300 font-bold block mb-0.5">
                                  ⚡ {tc.tool}()
                                </span>
                                {tc.args && Object.keys(tc.args).length > 0 && (
                                  <span className="text-slate-400 text-[11px] block break-all">
                                    args: {JSON.stringify(tc.args)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Rendered Content */}
                    <div className="markdown-prose text-xs sm:text-sm text-slate-200 space-y-3 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2: ({ children }) => (
                            <h2 className="text-sm font-bold text-amber-300 border-b border-slate-800 pb-1 mt-4 mb-2 flex items-center space-x-2 first:mt-0">
                              <span>{children}</span>
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mt-3 mb-1.5">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 space-y-1 my-2 text-xs sm:text-sm text-slate-300">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 space-y-1 my-2 text-xs sm:text-sm text-slate-300">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-slate-300 leading-relaxed">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="my-2 leading-relaxed text-xs sm:text-sm text-slate-300">
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold text-slate-100">{children}</strong>
                          ),
                          code: ({ inline, children }) => (
                            <code
                              className={`px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] ${
                                inline ? '' : 'block p-3 overflow-x-auto my-2'
                              }`}
                            >
                              {children}
                            </code>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-3 border border-slate-800 rounded-xl">
                              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                              {children}
                            </thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                              {children}
                            </tbody>
                          ),
                          th: ({ children }) => <th className="p-2.5 font-bold">{children}</th>,
                          td: ({ children }) => <td className="p-2.5">{children}</td>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-amber-500/60 pl-3.5 my-2 text-xs text-slate-400 italic">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    {/* Footer Actions on Assistant Message */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Grounded in Python calculations</span>
                      </div>

                      <button
                        onClick={() => handleCopy(m.content, idx)}
                        className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start space-x-3.5 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2 max-w-md shadow-lg">
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
                  Querying analytical tools & synthesizing reasoning...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Pills (when conversation active) */}
      {messages.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto py-1.5 text-xs flex-shrink-0">
          {['What changed this week?', 'Where are we at risk of stock-outs?', 'What should I prioritize today?'].map(
            (p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="flex-shrink-0 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-300 text-xs transition disabled:opacity-40"
              >
                {p}
              </button>
            )
          )}
        </div>
      )}

      {/* Bottom Chat Input Bar */}
      <div className="glass-card rounded-2xl p-2 sm:p-2.5 border border-slate-800/80 flex items-end space-x-2 flex-shrink-0 shadow-xl shadow-black/40">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask anything about revenue shifts, inventory risk, return rates, or channel opportunities..."
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-3 py-2 focus:outline-none resize-none max-h-40 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-2.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1.5 flex-shrink-0"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
