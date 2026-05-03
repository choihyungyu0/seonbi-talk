import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useHeroMotion<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const pointerFrameRef = useRef(0)
  const pointerPositionRef = useRef({ x: 0, y: 0 })
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

      pointerPositionRef.current = {
        x: pointerX,
        y: pointerY,
      }

      if (pointerFrameRef.current) return

      pointerFrameRef.current = window.requestAnimationFrame(() => {
        pointerFrameRef.current = 0
        const { x, y } = pointerPositionRef.current
        setMotionVariable('--hero-pointer-x', `${x * 9}px`)
        setMotionVariable('--hero-pointer-y', `${y * 9}px`)
        setMotionVariable('--hero-pattern-x', `${x * -4}px`)
        setMotionVariable('--hero-pattern-y', `${y * -4}px`)
      })
    },
    [element, setMotionVariable],
  )

  const handlePointerLeave = useCallback(() => {
    if (pointerFrameRef.current) {
      window.cancelAnimationFrame(pointerFrameRef.current)
      pointerFrameRef.current = 0
    }

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
      if (rect.bottom < -120 || rect.top > window.innerHeight + 120) {
        return
      }

      const progress = clamp(-rect.top / Math.max(rect.height, window.innerHeight), 0, 1)
      const isCompact = window.matchMedia('(max-width: 640px)').matches
      const imageOffset = isCompact ? -6 : -16
      const imageScale = isCompact ? 1 + progress * 0.012 : 1 + progress * 0.035
      const patternOffset = isCompact ? progress * 5 : progress * 12

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
      if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [element])

  return [heroRef, handlePointerMove, handlePointerLeave] as const
}
