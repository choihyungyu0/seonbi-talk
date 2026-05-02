import { useState } from 'react'
import { CommonButton } from '../common/CommonButton'
import type { SeonbiTypeInfo } from '../../features/seonbi-test/types'
import { shareResult } from '../../features/result/shareResult'

interface ShareResultButtonProps {
  typeInfo: SeonbiTypeInfo
  disabled?: boolean
  onStatusChange: (message: string) => void
}

export function ShareResultButton({
  typeInfo,
  disabled = false,
  onStatusChange,
}: ShareResultButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  async function handleShare() {
    setIsSharing(true)
    onStatusChange('')

    try {
      const status = await shareResult(typeInfo)
      if (status === 'copied') {
        onStatusChange('공유 문구를 복사했습니다.')
      } else if (status === 'shared') {
        onStatusChange('공유를 완료했습니다.')
      } else {
        onStatusChange('공유를 취소했습니다.')
      }
    } catch {
      onStatusChange('공유에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <CommonButton
      type="button"
      variant="secondary"
      disabled={disabled || isSharing}
      isLoading={isSharing}
      onClick={handleShare}
    >
      친구에게 공유하기
    </CommonButton>
  )
}
