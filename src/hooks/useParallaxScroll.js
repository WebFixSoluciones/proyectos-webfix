import { useState, useEffect } from 'react';

/**
 * Calcula el desplazamiento de parallax proporcional al centro del viewport
 * respetando límites mínimos y máximos.
 *
 * @param {Object} params
 * @param {number} params.scrollY - Posición actual de scroll Y
 * @param {number} params.elementTop - Posición absoluta superior del elemento
 * @param {number} params.viewportHeight - Altura del viewport en px
 * @param {number} [params.speed=0.1] - Multiplicador de velocidad de desplazamiento
 * @param {number} [params.min=-100] - Límite mínimo de desplazamiento en px
 * @param {number} [params.max=100] - Límite máximo de desplazamiento en px
 * @returns {number} Offset limitado entre min y max
 */
export function calculateParallaxOffset({
  scrollY = 0,
  elementTop = 0,
  elementHeight = 200,
  viewportHeight = 800,
  speed = 0.1,
  min = -100,
  max = 100
}) {
  const elementCenter = elementTop + elementHeight / 2;
  const viewportCenter = scrollY + viewportHeight / 2;
  const distanceFromCenter = viewportCenter - elementCenter;
  const rawOffset = distanceFromCenter * speed;
  return Math.min(Math.max(rawOffset, min), max);
}

/**
 * Hook reactivo para efectos de parallax ligeros con window.requestAnimationFrame pasivo.
 *
 * @param {import('react').RefObject<HTMLElement | null> | HTMLElement | null} elementRef
 * @param {Object} [options]
 * @param {number} [options.speed=0.15] - Factor de velocidad de desplazamiento
 * @param {number} [options.min=-80] - Desplazamiento mínimo en px
 * @param {number} [options.max=80] - Desplazamiento máximo en px
 * @param {boolean} [options.disabled=false] - Desactiva el cálculo si es true
 * @returns {number} Offset Y en px
 */
export function useParallaxScroll(
  elementRef,
  { speed = 0.15, min = -80, max = 80, disabled = false } = {}
) {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) {
      setOffsetY(0);
      return;
    }

    let rafId = null;

    const updateOffset = () => {
      rafId = null;
      const el = elementRef?.current || (elementRef instanceof HTMLElement ? elementRef : null);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY ?? window.pageYOffset ?? 0;
      const elementTop = rect.top + scrollY;
      const elementHeight = rect.height || 200;
      const viewportHeight = window.innerHeight || 800;

      const calculated = calculateParallaxOffset({
        scrollY,
        elementTop,
        elementHeight,
        viewportHeight,
        speed,
        min,
        max
      });

      setOffsetY((prev) => (Math.abs(prev - calculated) > 0.1 ? calculated : prev));
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateOffset);
      }
    };

    // Cálculo inicial
    updateOffset();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [elementRef, speed, min, max, disabled]);

  return offsetY;
}

export default useParallaxScroll;
