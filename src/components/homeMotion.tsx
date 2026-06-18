import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from 'motion/react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { homeMotionEase } from './homeMotionConfig'

const visibleVariant = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
}

interface AnimatedSectionProps {
  'aria-label'?: string
  amount?: number
  animateOnLoad?: boolean
  children: ReactNode
  className?: string
  delayChildren?: number
  once?: boolean
  staggerChildren?: number
  style?: CSSProperties
}

export function AnimatedSection({
  'aria-label': ariaLabel,
  amount = 0.32,
  animateOnLoad = false,
  children,
  className,
  delayChildren = 0,
  once = true,
  staggerChildren = 0.1,
  style,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const usesCompactMotion = useCompactMotionViewport()
  const effectiveAmount = usesCompactMotion ? Math.min(amount, 0.16) : amount
  const variants = useMemo<Variants>(
    () => ({
      hidden: {},
      show: {
        transition: prefersReducedMotion
          ? { delayChildren: 0, staggerChildren: 0 }
          : { delayChildren, staggerChildren },
      },
    }),
    [delayChildren, prefersReducedMotion, staggerChildren],
  )

  return (
    <motion.div
      aria-label={ariaLabel}
      className={className}
      style={style}
      variants={variants}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate={animateOnLoad || prefersReducedMotion ? 'show' : undefined}
      whileInView={animateOnLoad || prefersReducedMotion ? undefined : 'show'}
      viewport={{ once, amount: effectiveAmount }}
    >
      {children}
    </motion.div>
  )
}

interface RevealItemProps {
  'aria-label'?: string
  amount?: number
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
  duration?: number
  once?: boolean
  scale?: number
  standalone?: boolean
  style?: CSSProperties
}

export function RevealItem({
  'aria-label': ariaLabel,
  amount = 0.3,
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 24,
  duration = 0.72,
  once = true,
  scale = 1,
  standalone = false,
  style,
}: RevealItemProps) {
  const prefersReducedMotion = useReducedMotion()
  const usesCompactMotion = useCompactMotionViewport()
  const variants = useMemo<Variants>(
    () => {
      const compactDirection =
        usesCompactMotion && (direction === 'left' || direction === 'right') ? 'up' : direction
      const effectiveDistance = usesCompactMotion ? Math.min(distance, 12) : distance
      const offset = getDirectionOffset(
        compactDirection,
        prefersReducedMotion ? 0 : effectiveDistance,
      )

      return {
        hidden: prefersReducedMotion
          ? visibleVariant
          : {
              opacity: 0,
              scale,
              ...offset,
            },
        show: {
          ...visibleVariant,
          transition: {
            delay: prefersReducedMotion ? 0 : delay,
            duration: prefersReducedMotion ? 0 : duration,
            ease: homeMotionEase,
          },
        },
      }
    },
    [delay, direction, distance, duration, prefersReducedMotion, scale, usesCompactMotion],
  )

  return (
    <motion.div
      aria-label={ariaLabel}
      className={['home-reveal-item', className].filter(Boolean).join(' ')}
      style={style}
      variants={variants}
      initial={standalone && !prefersReducedMotion ? 'hidden' : undefined}
      whileInView={standalone && !prefersReducedMotion ? 'show' : undefined}
      animate={standalone || prefersReducedMotion ? 'show' : undefined}
      viewport={standalone ? { once, amount } : undefined}
    >
      {children}
    </motion.div>
  )
}

interface HomeScrollProgressProps {
  className?: string
}

export function HomeScrollProgress({ className }: HomeScrollProgressProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const progress = useMotionValue(0)
  const scaleX = useSpring(progress, {
    damping: 26,
    stiffness: 160,
    mass: 0.32,
  })

  useEffect(() => {
    const scrollRoot = hostRef.current?.closest('.home-snap-container') as HTMLElement | null
    if (!scrollRoot) return undefined
    const root = scrollRoot

    let frameId = 0

    function updateProgress() {
      frameId = 0
      const maxScroll = Math.max(1, root.scrollHeight - root.clientHeight)
      progress.set(Math.min(1, Math.max(0, root.scrollTop / maxScroll)))
    }

    function requestProgressUpdate() {
      if (frameId) return
      frameId = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    root.addEventListener('scroll', requestProgressUpdate, { passive: true })
    window.addEventListener('resize', requestProgressUpdate)

    return () => {
      root.removeEventListener('scroll', requestProgressUpdate)
      window.removeEventListener('resize', requestProgressUpdate)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [progress])

  return (
    <div
      className={['home-scroll-progress', className].filter(Boolean).join(' ')}
      ref={hostRef}
      aria-hidden="true"
    >
      <motion.span style={{ scaleX }} />
    </div>
  )
}

interface AnimatedRouteLineProps {
  amount?: number
  className?: string
  drawOnLoad?: boolean
  path?: string
  viewBox?: string
}

export function AnimatedRouteLine({
  amount = 0.45,
  className,
  drawOnLoad = false,
  path = 'M8 92 C42 46 74 118 113 72 C143 38 166 48 192 16',
  viewBox = '0 0 200 120',
}: AnimatedRouteLineProps) {
  const prefersReducedMotion = useReducedMotion()
  const drawState = prefersReducedMotion
    ? { opacity: 1, pathLength: 1 }
    : { opacity: 1, pathLength: 1 }
  const hiddenState = prefersReducedMotion
    ? { opacity: 1, pathLength: 1 }
    : { opacity: 0.35, pathLength: 0 }

  return (
    <motion.svg
      className={['home-animated-route-line', className].filter(Boolean).join(' ')}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      viewport={{ once: true, amount }}
    >
      <motion.path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={hiddenState}
        animate={drawOnLoad || prefersReducedMotion ? drawState : undefined}
        whileInView={drawOnLoad || prefersReducedMotion ? undefined : drawState}
        viewport={{ once: true, amount }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.9,
          ease: homeMotionEase,
        }}
      />
    </motion.svg>
  )
}

interface FeatureStorySectionProps {
  cardsClassName?: string
  children: ReactNode
  className?: string
  preview: ReactNode
}

export function FeatureStorySection({
  cardsClassName,
  children,
  className,
  preview,
}: FeatureStorySectionProps) {
  return (
    <div className={['home-feature-story', className].filter(Boolean).join(' ')}>
      <aside className="home-feature-story-preview">{preview}</aside>
      <div className={['home-feature-story-cards', cardsClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  )
}

function useCompactMotionViewport() {
  const [usesCompactMotion, setUsesCompactMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 920px)')

    function syncMediaQuery() {
      setUsesCompactMotion(mediaQuery.matches)
    }

    syncMediaQuery()
    mediaQuery.addEventListener('change', syncMediaQuery)

    return () => {
      mediaQuery.removeEventListener('change', syncMediaQuery)
    }
  }, [])

  return usesCompactMotion
}

function getDirectionOffset(
  direction: RevealItemProps['direction'],
  distance: number,
): { x: number; y: number } {
  if (direction === 'left') return { x: -distance, y: 0 }
  if (direction === 'right') return { x: distance, y: 0 }
  if (direction === 'down') return { x: 0, y: -distance }
  if (direction === 'none') return { x: 0, y: 0 }
  return { x: 0, y: distance }
}
