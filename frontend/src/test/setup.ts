import '@testing-library/jest-dom/vitest'

// jsdom has no layout engine, so it doesn't implement matchMedia. Mantine's color scheme and
// `useMediaQuery` both call it on mount, so every test needs at least a no-op implementation.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
