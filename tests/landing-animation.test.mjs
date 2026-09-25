import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateParallaxOffset } from '../src/hooks/useParallaxScroll.js';

test('calculateParallaxOffset calcula el desplazamiento proporcional y respeta limites min/max', () => {
  const offsetNormal = calculateParallaxOffset({
    scrollY: 500,
    elementTop: 600,
    elementHeight: 200,
    viewportHeight: 800,
    speed: 0.1
  });
  // viewportCenter = 500 + 400 = 900. elementCenter = 600 + 100 = 700. diff = 200. offset = 20
  assert.equal(offsetNormal, 20);

  const offsetClamped = calculateParallaxOffset({
    scrollY: 3000,
    elementTop: 200,
    elementHeight: 200,
    viewportHeight: 800,
    speed: 0.2,
    max: 50
  });
  assert.equal(offsetClamped, 50);
});

test('calculateParallaxOffset respeta clamping inferior y altura de elemento', () => {
  const offsetMin = calculateParallaxOffset({
    scrollY: 0,
    elementTop: 1000,
    elementHeight: 100,
    viewportHeight: 800,
    speed: 0.5,
    min: -80,
    max: 80
  });
  // viewportCenter = 400. elementCenter = 1000 + 50 = 1050. diff = -650. raw = -325 -> clamped a -80
  assert.equal(offsetMin, -80);
});
