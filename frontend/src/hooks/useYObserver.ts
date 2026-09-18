import { useCallback, useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

/**
 * Subscribes to deep changes on a Yjs shared type and derives a plain snapshot from it via
 * `select` — the `Y.Doc` equivalent of Liveblocks' `useStorage(selector, isEqual)`, and the piece
 * with no direct Liveblocks equivalent to lean on (see "Rewrite 10 read hooks" in
 * `docs/local-first-mode-plan.md`).
 *
 * `select` is re-run on every notification from `target.observeDeep` (cheap — board records are
 * small), but the hook only tells React to re-render when `isEqual` says the result actually
 * changed, and otherwise keeps returning the same cached reference. This matters more here than
 * it did for Liveblocks: because free text now lives *inside* the same records structured fields
 * do (nested fragments, not a separate doc — see the plan's "Text fragments are nested" section),
 * `observeDeep` on e.g. the `options` array fires on every keystroke in any option's idea/
 * enabler/blocker text too, not just on structural changes. Callers pass an `isEqual` that only
 * compares the fields their `select` actually returns (ignoring fragment *content*, comparing
 * fragment *references* — which are stable across text edits) so a keystroke in one field doesn't
 * cascade into unrelated re-renders. `select` and `isEqual` must be referentially stable across
 * renders where `target` hasn't changed (wrap `select` in `useCallback` at the call site).
 */
export function useYObserver<T>(
  // Y.AbstractType's event type param is invariant, so a concrete Y.Map<V>/Y.Array<V> won't
  // structurally match AbstractType<unknown> — `any` is the standard way to accept "any Yjs
  // shared type" here, same as Yjs's own `observeDeep` typing.
  // biome-ignore lint/suspicious/noExplicitAny: see above
  target: Y.AbstractType<any>,
  select: () => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cacheRef = useRef<{ value: T } | null>(null)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // A fresh subscription (new `target`) invalidates any snapshot cached against the old one.
      cacheRef.current = null
      const handler = () => {
        const next = select()
        if (!cacheRef.current || !isEqual(cacheRef.current.value, next)) {
          cacheRef.current = { value: next }
          onStoreChange()
        }
      }
      target.observeDeep(handler)
      return () => target.unobserveDeep(handler)
    },
    [target, select, isEqual],
  )

  const getSnapshot = useCallback(() => {
    if (!cacheRef.current) {
      cacheRef.current = { value: select() }
    }
    return cacheRef.current.value
  }, [select])

  return useSyncExternalStore(subscribe, getSnapshot)
}

/** Shallow (one-level) equality for plain record objects — values compared with `Object.is`, so a
 * `Y.XmlFragment` field compares by reference (stable across text edits within it, see
 * `useYObserver`'s doc comment) while primitive fields compare by value. */
export function shallowEqualObject<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const aKeys = Object.keys(a) as (keyof T)[]
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => Object.is(a[key], b[key]))
}

/** Builds an array-of-records equality check from a per-record equality check — for read hooks
 * over a `Y.Array<Y.Map>` (options, rating properties, next steps). */
export function arrayEqual<T>(
  itemEqual: (a: T, b: T) => boolean,
): (a: readonly T[], b: readonly T[]) => boolean {
  return (a, b) => a.length === b.length && a.every((item, index) => itemEqual(item, b[index]))
}
