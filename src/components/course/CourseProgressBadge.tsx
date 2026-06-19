import { useLanguage } from '../../features/i18n/LanguageContext'

const courseProgressBadgeSrc = encodeURI('/images/new/image-removebg-preview (83).png')
const courseProgressBadgeEnSrc = '/images/new/course-progress-badge-en.png'

interface CourseProgressBadgeProps {
  className?: string
  label?: string
}

export function CourseProgressBadge({
  className = '',
  label = '코스 진행',
}: CourseProgressBadgeProps) {
  const { language } = useLanguage()
  const imageSrc = language === 'en' ? courseProgressBadgeEnSrc : courseProgressBadgeSrc
  const imageLabel = language === 'en' ? 'Course Progress' : label

  return (
    <div className={['course-progress-badge', className].filter(Boolean).join(' ')}>
      <img
        className="course-progress-badge__image"
        src={imageSrc}
        alt={imageLabel}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
