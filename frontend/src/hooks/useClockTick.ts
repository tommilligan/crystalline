import { useSyncExternalStore } from 'react'

/**
 * A single module-level `setInterval`, shared by every subscriber, so any number of components
 * showing the current time (`LiveClock`, `SessionTimer`, ...) tick from the same clock instead
 * of each running its own drifting interval — they update in the same React commit/paint rather
 * than visibly staggering by a few hundred ms against each other.
 */
let now = Date.now()
const listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null

function tick() {
  now = Date.now()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (intervalId === null) {
    intervalId = setInterval(tick, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

function getSnapshot() {
  return now
}

/** Current epoch ms, re-rendering every second in lockstep with every other subscriber. */
export function useClockTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
