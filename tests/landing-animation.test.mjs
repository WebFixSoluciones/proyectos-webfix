import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateParallaxOffset as hookCalculateParallaxOffset } from '../src/hooks/useParallaxScroll.js';

export function calculateParallaxOffset({ scrollY, elementTop, viewportHeight, speed = 0.1, min = -100, max = 100 }) {
  const elementCenter = elementTop + 100;
  const viewportCenter = scrollY + viewportHeight / 2;
  const distanceFromCenter = viewportCenter - elementCenter;
  const rawOffset = distanceFromCenter * speed;
  return Math.min(Math.max(rawOffset, min), max);
}

test('calculateParallaxOffset calcula el desplazamiento proporcional y respeta limites min/max', () => {
  const offsetNormal = calculateParallaxOffset({
    scrollY: 500,
    elementTop: 600,
    viewportHeight: 800,
    speed: 0.1
  });
  assert.equal(offsetNormal, 20);

  const offsetClamped = calculateParallaxOffset({
    scrollY: 3000,
    elementTop: 200,
    viewportHeight: 800,
    speed: 0.2,
    max: 50
  });
  assert.equal(offsetClamped, 50);
});

test('calculateParallaxOffset exportada desde useParallaxScroll coincide con la logica base', () => {
  const offsetNormal = hookCalculateParallaxOffset({
    scrollY: 500,
    elementTop: 600,
    viewportHeight: 800,
    speed: 0.1
  });
  assert.equal(offsetNormal, 20);

  const offsetClamped = hookCalculateParallaxOffset({
    scrollY: 3000,
    elementTop: 200,
    viewportHeight: 800,
    speed: 0.2,
    max: 50
  });
  assert.equal(offsetClamped, 50);

  const offsetMin = hookCalculateParallaxOffset({
    scrollY: 0,
    elementTop: 1000,
    viewportHeight: 800,
    speed: 0.5,
    min: -80,
    max: 80
  });
  assert.equal(offsetMin, -80);
});
