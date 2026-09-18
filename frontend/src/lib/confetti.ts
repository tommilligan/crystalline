import confetti from 'canvas-confetti'

/** Fires a short confetti burst anchored at a click point (viewport pixel coordinates) —
 * `canvas-confetti`'s `origin` is normalized to the viewport, not pixels, so this does that
 * conversion once here rather than at each call site. Used to celebrate signing the decision. */
export function fireConfettiFromPoint(clientX: number, clientY: number): void {
  const origin = { x: clientX / window.innerWidth, y: clientY / window.innerHeight }
  confetti({ particleCount: 100, spread: 70, startVelocity: 45, origin })
  confetti({ particleCount: 60, spread: 120, startVelocity: 25, scalar: 0.75, decay: 0.88, origin })
}
