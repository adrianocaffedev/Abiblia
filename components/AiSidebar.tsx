import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot } from 'lucide-react';
import { askBibleAssistant } from '../services/geminiService';

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  context: string; // Current chapter text summary or name
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen, onClose, context }) => {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'ai',
    text: 'Olá! A paz seja convosco. Estou aqui para ajudar a aprofundar seu entendimento sobre este capítulo. O que gostaria de saber?'
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Reset chat when chapter changes (context changes)
  useEffect(() => {
      setMessages([{
        role: 'ai',
        text: `Estou pronto para discutir sobre ${context}. Tem alguma dúvida teológica ou histórica?`
      }]);
  }, [context]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const response = await askBibleAssistant(userMsg, context);

    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
  };

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-stone-200`}>
      
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h3 className="font-semibold">Assistente Bíblico</h3>
        </div>
        <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded transition-colors">
            <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                }`}>
                    {msg.role === 'ai' && <Bot className="w-4 h-4 mb-1 text-indigo-500" />}
                    <div className="markdown-body leading-relaxed">
                        {msg.text}
                    </div>
                </div>
            </div>
        ))}
        {isTyping && (
            <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg rounded-bl-none border border-stone-200 shadow-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-200">
        <div className="flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Faça uma pergunta..."
                className="flex-1 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};
