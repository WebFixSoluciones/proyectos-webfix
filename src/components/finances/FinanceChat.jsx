import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton, UiInput } from '../ui/controls';
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
    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"flex flex-col h-full overflow-hidden"}}>
      {/* HEADER CHAT */}
      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"px-4 py-3 flex items-center justify-between"}}>
        <UiBox {...{"className":"flex items-center gap-2"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-11)"},"className":"p-1.5"}}>
            <Sparkles size={16} />
          </UiBox>
          <UiBox>
            <UiHeading as="h4" {...{"size":"1","weight":"bold"}}>Asistente Contable AI</UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>Respuestas basadas en tu base contable</UiText>
          </UiBox>
        </UiBox>
        {onClose && (
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}>
            <X size={14} />
          </UiButton>
        )}
      </UiBox>

      {/* BURBUJAS DE CHAT */}
      <UiBox ref={chatContainerRef} {...{"className":"flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar"}}>
        {messages.map((msg, i) => (
          <UiBox key={i} {...mergeThemeProps({"className":"flex gap-2 max-w-[85%]"}, {}, (msg.role === 'user' ? {"className":"ml-auto flex-row-reverse"} : {}))}>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-2 shrink-0 flex items-center justify-center h-7 w-7"}, {}, (msg.role === 'user' ? {"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)"}} : {"style":{"backgroundColor":"var(--purple-3)","color":"var(--purple-11)"}}))}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
            </UiBox>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-3 leading-relaxed whitespace-pre-line"}, {}, (msg.role === 'user' ? {"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)","borderRadius":"var(--radius-3)"}} : {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)","borderRadius":"var(--radius-3)"}}))}>
              {msg.text}
            </UiBox>
          </UiBox>
        ))}

        {isLoading && (
          <UiBox {...{"className":"flex gap-2 max-w-[80%]"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-11)"},"className":"p-2 shrink-0 flex items-center justify-center h-7 w-7"}}>
              <Bot size={12} />
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
