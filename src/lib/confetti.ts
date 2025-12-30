/**
 * Confetti animation for successful generations
 * Uses canvas-confetti library pattern but implemented with CSS
 */

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  duration?: number;
}

const defaultColors = ['#00D9FF', '#FFD700', '#A78BFA', '#34D399', '#F472B6'];

export function fireConfetti(options: ConfettiOptions = {}) {
  const {
    particleCount = 50,
    spread = 70,
    origin = { x: 0.5, y: 0.5 },
    colors = defaultColors,
    duration = 3000,
  } = options;

  // Create container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const startX = origin.x * window.innerWidth;
    const startY = origin.y * window.innerHeight;
    
    // Random direction
    const angle = (Math.random() - 0.5) * spread * (Math.PI / 180) * 2;
    const velocity = Math.random() * 500 + 200;
    const endX = startX + Math.sin(angle) * velocity;
    const endY = startY - Math.cos(angle) * velocity + Math.random() * 200;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      left: ${startX}px;
      top: ${startY}px;
      opacity: 1;
      transform: rotate(${Math.random() * 360}deg);
      animation: confetti-fall ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      --end-x: ${endX - startX}px;
      --end-y: ${endY - startY + 500}px;
      --rotation: ${Math.random() * 720 - 360}deg;
      animation-delay: ${Math.random() * 100}ms;
    `;
    
    container.appendChild(particle);
  }

  // Add keyframes if not exists
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translate(0, 0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(var(--end-x), var(--end-y)) rotate(var(--rotation));
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup
  setTimeout(() => {
    container.remove();
  }, duration + 100);
}

// Preset for generation success
export function celebrateGeneration() {
  // Fire from center
  fireConfetti({
    particleCount: 60,
    spread: 90,
    origin: { x: 0.5, y: 0.6 },
    duration: 2500,
  });
  
  // Fire from sides after a delay
  setTimeout(() => {
    fireConfetti({
      particleCount: 30,
      spread: 60,
      origin: { x: 0.2, y: 0.8 },
      duration: 2000,
    });
    fireConfetti({
      particleCount: 30,
      spread: 60,
      origin: { x: 0.8, y: 0.8 },
      duration: 2000,
    });
  }, 150);
}



