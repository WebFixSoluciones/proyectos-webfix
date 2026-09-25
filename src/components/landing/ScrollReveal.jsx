import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente contenedor de revelado reactivo al scroll.
 * Utiliza IntersectionObserver con transiciones cubic-bezier(0.16, 1, 0.3, 1)
 * para animar suavemente la opacidad, traslación y escala de elementos al entrar
 * y salir del viewport.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elementos hijos a animar
 * @param {'up' | 'down' | 'fade' | 'left' | 'right'} [props.direction='up'] - Dirección del desplazamiento
 * @param {number} [props.delay=0] - Retardo de la animación en milisegundos
 * @param {number} [props.threshold=0.12] - Porcentaje de visibilidad para disparar la animación
 * @param {boolean} [props.triggerOnce=false] - Si es false, anima entrada y salida continuas al scrollear
 * @param {number} [props.duration=650] - Duración de la animación en milisegundos
 * @param {number} [props.distance=24] - Distancia de desplazamiento inicial en píxeles
 * @param {number} [props.scale=0.96] - Escala inicial antes de revelarse
 * @param {string} [props.className=''] - Clases CSS adicionales
 * @param {React.CSSProperties} [props.style={}] - Estilos inline adicionales
 * @param {React.ElementType} [props.as='div'] - Elemento HTML o componente contenedor
 */
export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.12,
  triggerOnce = false,
  duration = 650,
  distance = 24,
  scale = 0.96,
  className = '',
  style = {},
  as: Component = 'div',
  ...rest
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handleMotionChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMotionChange);
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || prefersReducedMotion) {
      if (prefersReducedMotion) setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else {
          if (!triggerOnce) {
            setIsVisible(false);
          }
        }
      },
      {
        threshold,
        rootMargin: '0px'
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, triggerOnce, prefersReducedMotion]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'down':
        return `translate3d(0, -${distance}px, 0) scale(${scale})`;
      case 'fade':
        return `scale(${scale})`;
      case 'left':
        return `translate3d(${distance}px, 0, 0) scale(${scale})`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0) scale(${scale})`;
      case 'up':
      default:
        return `translate3d(0, ${distance}px, 0) scale(${scale})`;
    }
  };

  const animationStyle = prefersReducedMotion
    ? { opacity: 1, transform: 'none' }
    : {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate3d(0, 0, 0) scale(1)' : getInitialTransform(),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform'
      };

  return (
    <Component
      ref={containerRef}
      className={className}
      style={{
        ...animationStyle,
        ...style
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
