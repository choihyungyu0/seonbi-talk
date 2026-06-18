const courseProgressBadgeSrc = encodeURI('/images/new/image-removebg-preview (83).png')

interface CourseProgressBadgeProps {
  className?: string
  label?: string
}

export function CourseProgressBadge({
  className = '',
  label = '코스 진행',
}: CourseProgressBadgeProps) {
  return (
    <div className={['course-progress-badge', className].filter(Boolean).join(' ')}>
      <img className="course-progress-badge__image" src={courseProgressBadgeSrc} alt={label} />
    </div>
  )
}
