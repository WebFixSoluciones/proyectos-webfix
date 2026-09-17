import { UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton } from '../ui/controls';
import React from 'react';
import { AlertOctagon, RefreshCw, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleCopy = () => {
    const errorText = `${this.state.error?.name}: ${this.state.error?.message}\n${this.state.error?.stack}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)"},"className":"p-6 md:p-8 m-4 animate-in fade-in duration-300"}}>
          <UiBox {...{"className":"flex items-start gap-4"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)","borderRadius":"var(--radius-3)"},"className":"p-3 shrink-0"}}>
              <AlertOctagon size={24} />
            </UiBox>
            <UiBox {...{"className":"flex-1 min-w-0"}}>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"red","className":"mb-1"}}>
                {this.props.title || "Se produjo un error al renderizar esta sección"}
              </UiHeading>
              <UiText as="p" {...{"size":"1","color":"red","weight":"medium","className":"mb-3"}}>
                Ocurrió una excepción no controlada. Puedes revisar el detalle técnico abajo o intentar recargar la sección.
              </UiText>

              <UiBox {...{"style":{"backgroundColor":"var(--red-9)","color":"var(--red-12)","borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)","border":"1px solid var(--gray-a6)"},"className":"p-3 overflow-x-auto mb-4 max-h-48 custom-scrollbar"}}>
                <UiText as="p" {...{"weight":"bold","color":"red","className":"mb-1"}}>
                  {this.state.error?.name}: {this.state.error?.message}
                </UiText>
                {this.state.error?.stack && (
                  <pre {...{"className":"leading-relaxed opacity-80 whitespace-pre-wrap"}}>
                    {this.state.error.stack}
                  </pre>
                )}
              </UiBox>

              <UiBox {...{"className":"flex items-center gap-2"}}>
                <UiButton
                  onClick={this.handleReset}
                  {...{"variant":"solid","color":"red","size":"2","className":"flex items-center gap-1.5"}}
                >
                  <RefreshCw size={14} /> Reintentar
                </UiButton>
                <UiButton
                  onClick={this.handleCopy}
                  {...{"variant":"surface","color":"gray","size":"2","className":"flex items-center gap-1.5"}}
                >
                  {this.state.copied ? <Check size={14} {...{"style":{"color":"var(--green-11)"}}} /> : <Copy size={14} />}
                  {this.state.copied ? "Copiado" : "Copiar Error"}
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>
        </UiBox>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
