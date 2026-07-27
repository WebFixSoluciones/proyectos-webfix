import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, X, AlertCircle } from 'lucide-react';
import { chatearConAsistenteContable } from '../../services/geminiService';

export default function FinanceChat({ transactions, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: '¡Hola! Soy tu asistente contable inteligente. ¿En qué puedo ayudarte hoy? Puedo analizar tus comprobantes, darte resúmenes de impuestos o clasificar gastos.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Filtrar historial previo de la conversación para enviarlo (excluyendo el primer saludo estático)
      const history = messages.slice(1);
      
      const response = await chatearConAsistenteContable(
        userMessage,
        history,
        transactions
      );

      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al comunicarse con la IA. Verifica tu API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-card border overflow-hidden bg-white border-gray-200">
      {/* HEADER CHAT */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold">Asistente Contable AI</h4>
            <p className="text-xs text-gray-500">Respuestas basadas en tu base contable</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-icon text-gray-400 hover:text-gray-200">
            <X size={14} />
          </button>
        )}
      </div>

      {/* BURBUJAS DE CHAT */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar text-xs">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-card shrink-0 flex items-center justify-center h-7 w-7 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-purple-600/20 text-purple-400'}`}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={`p-3 rounded-card leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 max-w-[80%]">
            <div className="p-2 rounded-card bg-purple-600/20 text-purple-400 shrink-0 flex items-center justify-center h-7 w-7">
              <Bot size={12} />
            </div>
            <div className="p-3 rounded-card rounded-tl-none flex items-center gap-1.5 bg-gray-100 text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-card border flex gap-2 text-xs items-start bg-red-50 border-red-200 text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error al chatear</p>
              <p className="text-xs opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* INPUT CHAT */}
      <form onSubmit={handleSend} className="p-3 border-t flex gap-2 items-center border-gray-100 bg-white">
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Pregúntame algo sobre tus finanzas..."
          className="flex-1 text-xs px-3 py-2 rounded-card border outline-none transition-all bg-gray-50 border-gray-200 text-gray-900 focus:border-primary/50"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="btn-icon bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
