import { useCallback, useEffect, useState, type PointerEvent } from 'react'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useHeroMotion<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const heroRef = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  const setMotionVariable = useCallback(
    (name: string, value: string) => {
      element?.style.setProperty(name, value)
    },
    [element],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!element) return
      if (!window.matchMedia('(pointer: fine)').matches) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const rect = event.currentTarget.getBoundingClientRect()
      const pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      const pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2

      setMotionVariable('--hero-pointer-x', `${pointerX * 16}px`)
      setMotionVariable('--hero-pointer-y', `${pointerY * 16}px`)
      setMotionVariable('--hero-pattern-x', `${pointerX * -7}px`)
      setMotionVariable('--hero-pattern-y', `${pointerY * -7}px`)
    },
    [element, setMotionVariable],
  )

  const handlePointerLeave = useCallback(() => {
    setMotionVariable('--hero-pointer-x', '0px')
    setMotionVariable('--hero-pointer-y', '0px')
    setMotionVariable('--hero-pattern-x', '0px')
    setMotionVariable('--hero-pattern-y', '0px')
  }, [setMotionVariable])

  useEffect(() => {
    if (!element) return

    const heroElement = element
    let frameId = 0

    function updateScrollMotion() {
      frameId = 0

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroElement.style.setProperty('--hero-scroll-y', '0px')
        heroElement.style.setProperty('--hero-scroll-scale', '1')
        heroElement.style.setProperty('--hero-pattern-scroll-y', '0px')
        return
      }

      const rect = heroElement.getBoundingClientRect()
      const progress = clamp(-rect.top / Math.max(rect.height, window.innerHeight), 0, 1)
      const isCompact = window.matchMedia('(max-width: 640px)').matches
      const imageOffset = isCompact ? -10 : -24
      const imageScale = isCompact ? 1 + progress * 0.025 : 1 + progress * 0.06
      const patternOffset = isCompact ? progress * 10 : progress * 26

      heroElement.style.setProperty('--hero-scroll-y', `${progress * imageOffset}px`)
      heroElement.style.setProperty('--hero-scroll-scale', imageScale.toFixed(3))
      heroElement.style.setProperty('--hero-pattern-scroll-y', `${patternOffset}px`)
    }

    function scheduleUpdate() {
      if (frameId) return
      frameId = window.requestAnimationFrame(updateScrollMotion)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [element])

  return [heroRef, handlePointerMove, handlePointerLeave] as const
}
