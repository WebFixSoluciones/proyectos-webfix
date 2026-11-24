import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton, UiModalCloseButton, UiInput } from '../ui/controls';
import { UiIconBadge } from '../ui/UiIconBadge';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, AlertCircle } from 'lucide-react';
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
    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"flex flex-col h-full overflow-hidden"}}>
      {/* HEADER CHAT */}
      <UiBox className="px-4 py-3 flex items-center justify-between border-b border-[#E3E3E3] bg-[#FAFAFA]">
        <UiBox className="flex items-center gap-2.5">
          <UiIconBadge level="modal" tone="brand" icon={Sparkles} />
          <UiBox>
            <UiHeading as="h4" size="1" weight="bold">Asistente Contable AI</UiHeading>
            <UiText as="p" size="1" color="gray">Respuestas basadas en tu base contable</UiText>
          </UiBox>
        </UiBox>
        {onClose && <UiModalCloseButton onClick={onClose} />}
      </UiBox>

      {/* BURBUJAS DE CHAT */}
      <UiBox ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <UiBox key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <UiBox
              className={`p-2 shrink-0 flex items-center justify-center h-7 w-7 rounded-[8px] border ${
                msg.role === 'user'
                  ? 'bg-[#1B1B1B] text-white border-[#1B1B1B]'
                  : 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
              }`}
            >
              {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </UiBox>
            <UiBox
              className={`p-3 rounded-[10px] leading-relaxed whitespace-pre-line text-xs ${
                msg.role === 'user'
                  ? 'bg-[#1B1B1B] text-white'
                  : 'bg-[#FAFAFA] text-[#1B1B1B] border border-[#E3E3E3]'
              }`}
            >
              {msg.text}
            </UiBox>
          </UiBox>
        ))}

        {isLoading && (
          <UiBox className="flex gap-2 max-w-[80%]">
            <UiBox className="p-2 shrink-0 flex items-center justify-center h-7 w-7 rounded-[8px] bg-[#E8FEDF] text-[#004227] border border-[#B3F4CB]">
              <Bot size={13} />
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--gray-11)"},"className":"p-3 flex items-center gap-1.5"}}>
              <UiText {...{"className":"w-1.5 h-1.5 animate-bounce"}} style={{ animationDelay: '0ms' }}></UiText>
              <UiText {...{"className":"w-1.5 h-1.5 animate-bounce"}} style={{ animationDelay: '150ms' }}></UiText>
              <UiText {...{"className":"w-1.5 h-1.5 animate-bounce"}} style={{ animationDelay: '300ms' }}></UiText>
            </UiBox>
          </UiBox>
        )}

        {error && (
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-12)"},"className":"p-3 flex gap-2 items-start"}}>
            <AlertCircle size={14} {...{"className":"shrink-0 mt-0.5"}} />
            <UiBox>
              <UiText as="p" {...{"weight":"bold"}}>Error al chatear</UiText>
              <UiText as="p" {...{"size":"1","className":"opacity-90 mt-0.5"}}>{error}</UiText>
            </UiBox>
          </UiBox>
        )}
      </UiBox>

      {/* INPUT CHAT */}
      <form onSubmit={handleSend} {...{"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-3 flex gap-2 items-center"}}>
        <UiInput
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Pregúntame algo sobre tus finanzas..."
          {...{"size":"2","color":"gray","className":"flex-1"}}
        />
        <UiButton iconOnly
          type="submit" 
          disabled={!input.trim() || isLoading}
          {...{"variant":"solid","color":"purple","className":"disabled:opacity-50 shrink-0"}}
        >
          <Send size={14} />
        </UiButton>
      </form>
    </UiBox>
  );
}
