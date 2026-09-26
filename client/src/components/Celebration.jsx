import React, { useEffect, useMemo } from 'react';
import { playCelebration } from '../utils/sound';

const EMOJI = ['🎉', '✨', '🎊', '🙌', '🏆', '💫', '🎯', '💳'];
const CONFETTI_COLORS = ['#f6c453', '#4a90d9', '#2fbf71', '#e2585f', '#8b5cf6', '#22c1c3', '#ff8a3d'];

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const buildPieces = (grand) => ({
  confetti: Array.from({ length: grand ? 44 : 20 }, (_, i) => ({
    id: `c${i}`,
    left: rand(2, 98),
    delay: rand(0, 0.3),
    duration: rand(1.1, 2),
    rotate: rand(0, 720),
    size: rand(5, 9),
    color: pick(CONFETTI_COLORS),
    round: Math.random() > 0.55,
  })),
  emojis: Array.from({ length: grand ? 7 : 4 }, (_, i) => ({
    id: `e${i}`,
    left: rand(8, 92),
    delay: rand(0, 0.35),
    duration: rand(1.3, 2.1),
    size: rand(20, 36),
    drift: rand(-60, 60),
    rotate: rand(-40, 40),
    char: pick(EMOJI),
  })),
});

/**
 * A short celebratory burst: confetti plus congratulation emoji, with a
 * matching chime. Fired only when the user completes an action. Honours
 * prefers-reduced-motion by showing the badge without the movement.
 */
export default function Celebration({ burst, onDone }) {
  useEffect(() => {
    if (!burst) return undefined;
    playCelebration(burst.grand);
    const timer = window.setTimeout(onDone, burst.grand ? 2500 : 1800);
    return () => window.clearTimeout(timer);
  }, [burst, onDone]);

  const pieces = useMemo(() => (burst ? buildPieces(burst.grand) : null), [burst]);

  if (!burst) return null;
  const still = prefersReducedMotion();

  return (
    <div className={`celebration${still ? ' still' : ''}`} aria-hidden="true">
      <div className="celebration-badge" key={`badge-${burst.id}`}>
        {burst.message || '🎉'}
      </div>
      {!still && pieces.confetti.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece${p.round ? ' round' : ''}`}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.round ? p.size : p.size * 1.7,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      {!still && pieces.emojis.map((e) => (
        <span
          key={e.id}
          className="celebration-emoji"
          style={{
            left: `${e.left}%`,
            fontSize: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            '--drift': `${e.drift}px`,
            '--spin': `${e.rotate}deg`,
          }}
        >
          {e.char}
        </span>
      ))}
    </div>
  );
}
