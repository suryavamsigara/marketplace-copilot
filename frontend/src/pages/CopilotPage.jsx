import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client';
import {
  Sparkles,
  Send,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RotateCcw,
  Activity,
  Cpu,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What changed this week?',
  'Where are we at risk of stock-outs?',
  'Which products have unusual return rates?',
  'What should I prioritize today?',
];

export default function CopilotPage() {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize with transferred explanation if navigating from "Ask follow up in copilot"
  useEffect(() => {
    if (location.state?.initialAnswer) {
      setMessages([
        {
          role: 'user',
          content: location.state.initialPrompt || `Explain: ${location.state.title || 'Opportunity'}`,
        },
        {
          role: 'assistant',
          content: location.state.initialAnswer,
          mode: 'llm',
          tool_calls: [],
        },
      ]);
      // Clear location state history so reload doesn't re-seed
      window.history.replaceState({}, document.title);
      // Auto-focus textarea for seamless follow-up typing
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [location.state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (userPrompt) => {
    const text = (userPrompt || input).trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const historyPayload = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    // Append user message + placeholder assistant message for streaming
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        content: '',
        mode: 'llm',
        tool_calls: [],
        currentTool: 'Evaluating question & selecting analytical tools...',
      },
    ]);

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      await api.streamChat(
        {
          message: text,
          history: historyPayload,
        },
        (event) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              const current = updated[lastIdx];

              if (event.type === 'tool_start') {
                const existingTools = current.tool_calls || [];
                const alreadyExists = existingTools.some(
                  (t) => t.tool === event.tool && JSON.stringify(t.args) === JSON.stringify(event.args)
                );
                updated[lastIdx] = {
                  ...current,
                  currentTool: event.label,
                  tool_calls: alreadyExists
                    ? existingTools
                    : [...existingTools, { tool: event.tool, label: event.label, args: event.args }],
                };
              } else if (event.type === 'tool_done') {
                updated[lastIdx] = {
                  ...current,
                  currentTool: 'Synthesizing verified business metrics...',
                };
              } else if (event.type === 'token') {
                updated[lastIdx] = {
                  ...current,
                  content: event.accumulated,
                  currentTool: null,
                };
              } else if (event.type === 'done') {
                updated[lastIdx] = {
                  ...current,
                  currentTool: null,
                };
              }
            }
            return updated;
          });
        }
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            role: 'assistant',
            content: `Unable to reach the reasoning service: ${err.message}`,
            mode: 'error',
            error: err.message,
            currentTool: null,
          };
        }
        return updated;
      });
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
    <div className="h-[calc(100vh-120px)] flex flex-col max-w-4xl mx-auto w-full select-text">
      {/* Main Chat Thread (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto space-y-8 px-4 sm:px-6 py-8" style={{ scrollBehavior: 'smooth' }}>

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
            <div className="w-12 h-12 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center shadow-sm mb-6">
              <Sparkles className="w-6 h-6 text-slate-300" />
            </div>
            <h2 className="text-xl font-medium text-slate-200 tracking-tight mb-8">
              How can I help you today?
            </h2>
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="text-left px-5 py-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 text-[14px] text-slate-300 transition-colors shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
              {isUser ? (
                <div className="bg-slate-800 text-slate-100 px-5 py-3 rounded-3xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <div className="flex items-start space-x-4 max-w-3xl w-full group">
                  <div className="w-8 h-8 rounded-full bg-[#0b0f19] border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">

                    {/* Live Tool Execution Status Pill */}
                    {m.currentTool && (
                      <div className="mb-3 flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium w-fit animate-pulse">
                        <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <span>{m.currentTool}</span>
                      </div>
                    )}

                    {/* Tool trace (subtle UI) */}
                    {m.tool_calls && m.tool_calls.length > 0 && !m.currentTool && (
                      <div className="mb-3">
                        <button
                          onClick={() => toggleToolTrace(idx)}
                          className="flex items-center space-x-2 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Terminal className="w-3.5 h-3.5 text-amber-400/80" />
                          <span>Analyzed data using {m.tool_calls.length} tool{m.tool_calls.length > 1 ? 's' : ''}</span>
                          {expandedTools[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedTools[idx] && (
                          <div className="mt-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-[12px] font-mono text-slate-400 space-y-2">
                            {m.tool_calls.map((tc, tIdx) => (
                              <div key={tIdx} className="flex items-start space-x-2">
                                <span className="text-amber-400">⚡</span>
                                <div>
                                  <span className="text-slate-300 font-semibold">{tc.tool}()</span>
                                  {tc.label && <span className="text-slate-500 text-[11px] block">{tc.label}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Rendered Content */}
                    <div className="text-[15px] text-slate-200 leading-relaxed space-y-4">
                      {m.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-100 mt-6 mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold text-slate-200 mt-5 mb-2">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-slate-300">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-3 text-slate-300">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                            code: ({ inline, children }) => (
                              <code className={`font-mono text-[13px] ${inline ? 'px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300' : 'block p-4 overflow-x-auto my-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300'}`}>
                                {children}
                              </code>
                            ),
                            table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-slate-800"><table className="w-full text-left text-[14px] text-slate-300 divide-y divide-slate-800">{children}</table></div>,
                            thead: ({ children }) => <thead className="bg-slate-900/50 text-slate-400 font-medium">{children}</thead>,
                            tbody: ({ children }) => <tbody className="divide-y divide-slate-800/50">{children}</tbody>,
                            th: ({ children }) => <th className="p-3 font-medium">{children}</th>,
                            td: ({ children }) => <td className="p-3">{children}</td>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-700 pl-4 my-4 text-slate-400 italic">{children}</blockquote>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      ) : (
                        !m.currentTool && (
                          <div className="flex items-center space-x-1.5 py-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                        )
                      )}
                    </div>

                    {/* Hover Actions */}
                    {m.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 mt-3">
                        <button
                          onClick={() => handleCopy(m.content, idx)}
                          className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="text-xs font-medium">{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area (Fixed to bottom of container) */}
      <div className="px-4 sm:px-6 pb-4 pt-2 flex-shrink-0">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-800 to-slate-700 rounded-[28px] blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
          <div className="relative flex items-end bg-slate-900 border border-slate-700/80 rounded-3xl shadow-sm focus-within:border-slate-500 transition-colors overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={messages.length > 0 ? "Ask a follow-up question..." : "Message Copilot..."}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 max-h-48 bg-transparent text-slate-100 placeholder-slate-500 text-[15px] px-5 py-4 pr-16 focus:outline-none resize-none leading-relaxed"
            />
            <div className="absolute right-3 bottom-3 flex items-center space-x-1.5">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                  title="New Chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2 rounded-full bg-slate-100 hover:bg-white text-slate-900 disabled:bg-slate-800 disabled:text-slate-600 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}