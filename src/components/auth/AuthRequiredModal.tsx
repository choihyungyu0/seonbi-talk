import { Link } from 'react-router-dom'
import { CommonButton } from '../common/CommonButton'

interface AuthRequiredModalProps {
  open: boolean
  onClose: () => void
}

export function AuthRequiredModal({ open, onClose }: AuthRequiredModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="auth-required-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
      >
        <h2 id="auth-required-title">로그인이 필요한 기능입니다</h2>
        <p>
          나의 선비유형 결과와 여행 코스를 저장하려면 로그인이 필요해요.
        </p>
        <div className="modal-actions">
          <Link className="common-button common-button--primary" to="/login">
            로그인하기
          </Link>
          <CommonButton type="button" variant="secondary" onClick={onClose}>
            계속 둘러보기
          </CommonButton>
        </div>
      </section>
    </div>
  )
}
