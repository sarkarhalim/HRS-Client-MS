import React, { useState, useRef, useEffect } from 'react';
import { Client, Disbursement, AgentPayment } from '../types';
import { chatWithData } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface ChatBotProps {
  clients: Client[];
  disbursements: Disbursement[];
  agentPayments: AgentPayment[];
}

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const ChatBot: React.FC<ChatBotProps> = ({ clients, disbursements, agentPayments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', parts: [{ text: 'Hello! I am your AI assistant. Ask me anything about your clients, disbursements, or agent payments.' }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    
    setMessages(newMessages);
    setIsLoading(true);

    // We only send the history (excluding the first greeting if we want, or keeping it)
    // Actually, let's send the whole history except the very first greeting to save tokens, 
    // or just send everything.
    const historyToPass = newMessages.slice(1, -1); // Exclude first greeting and the just-added user message

    const responseText = await chatWithData(
      clients,
      disbursements,
      agentPayments,
      historyToPass,
      userMessage
    );

    setMessages([
      ...newMessages,
      { role: 'model', parts: [{ text: responseText }] }
    ]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all z-50"
        title="AI Assistant"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-4 fade-in">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold text-sm uppercase tracking-widest">AI Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.parts[0].text
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your data..."
                className="flex-1 px-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
