import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

// API-uri de browser lipsa in jsdom, folosite de motion-v si chart.js
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {}
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// apelat de scrollBehavior din router
window.scrollTo = () => {}
