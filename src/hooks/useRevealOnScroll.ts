import { useCallback, useEffect, useState } from 'react'

export function useRevealOnScroll<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const revealRef = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element || isVisible) return

    if (!('IntersectionObserver' in window)) {
      const timeoutId = globalThis.setTimeout(() => setIsVisible(true), 0)
      return () => globalThis.clearTimeout(timeoutId)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timeoutId = globalThis.setTimeout(() => setIsVisible(true), 0)
      return () => globalThis.clearTimeout(timeoutId)
    }

    if (element.getBoundingClientRect().top < window.innerHeight) {
      const timeoutId = globalThis.setTimeout(() => setIsVisible(true), 0)
      return () => globalThis.clearTimeout(timeoutId)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12,
      },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [element, isVisible])

  return [revealRef, isVisible] as const
}
