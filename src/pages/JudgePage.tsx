import { useState } from 'react'
import type { FormEvent } from 'react'
import { CommonButton } from '../components/common/CommonButton'
import { ProtectedFeaturePrompt } from '../components/common/ProtectedFeaturePrompt'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { trackEvent } from '../features/analytics/trackEvent'
import { requestSeonbiAdvice } from '../features/judge/judgeApi'
import type { JudgeResult } from '../features/judge/judgeTypes'
import { loadTestResult } from '../lib/storage'

const defaultResultMessage = '문장을 입력하면 선비의 한마디가 표시됩니다.'

export function JudgePage() {
  const [testResult] = useState(() => loadTestResult())
  const [text, setText] = useState('')
  const [result, setResult] = useState<JudgeResult | null>(null)
  const [message, setMessage] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null
  const pageTitle = typeInfo ? `${typeInfo.name} 선비의 한마디` : '선비의 한마디'
  const canShareResult = Boolean(result)
  const canUseWebShare = typeof navigator.share === 'function'

  if (!testResult || !typeInfo) {
    return (
      <AppLayout>
        <section className="page-section page-container judge-page">
          <ProtectedFeaturePrompt />
        </section>
      </AppLayout>
    )
  }
  const activeTestResult = testResult

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedText = text.trim()
    if (!trimmedText) {
      setMessage('문장을 입력하면 선비의 한마디를 받을 수 있습니다.')
      setResult(null)
      return
    }

    setIsLoading(true)
    setMessage('')
    setShareMessage('')

    const response = await requestSeonbiAdvice(trimmedText, activeTestResult.type)

    if (!response.ok || !response.result) {
      setResult(null)
      setMessage(
        response.message ??
          '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
      setIsLoading(false)
      return
    }

    setResult(response.result)
    void trackEvent('judge_used', {
      seonbiType: activeTestResult.type,
      metadata: {
        hasSeonbiType: true,
      },
    })
    setIsLoading(false)
  }

  async function handleCopyShareText() {
    if (!result) return

    void trackEvent('judge_share_clicked', {
      seonbiType: activeTestResult.type,
      metadata: {
        method: 'copy',
      },
    })

    try {
      await navigator.clipboard.writeText(result.shareText)
      setShareMessage('공유 문구를 복사했습니다.')
    } catch {
      setShareMessage('공유 문구를 복사하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  async function handleShareResult() {
    if (!result || !canUseWebShare) return

    void trackEvent('judge_share_clicked', {
      seonbiType: activeTestResult.type,
      metadata: {
        method: 'web_share',
      },
    })

    try {
      await navigator.share({
        title: pageTitle,
        text: result.shareText,
      })
      setShareMessage('공유 창을 열었습니다.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareMessage('공유하기를 사용할 수 없습니다. 복사 기능을 이용해주세요.')
    }
  }

  return (
    <AppLayout>
      <section className="page-section page-container judge-page">
        <div className="section-heading center">
          <StatusBadge>선비의 한마디</StatusBadge>
          <h1>{pageTitle}</h1>
          <p>오늘의 문장을 선비 말투의 유쾌한 조언으로 바꿔드립니다.</p>
        </div>
        <div className="judge-grid">
          <div className="wisdom-visual" aria-hidden="true">
            書
          </div>
          <form className="surface-card judge-form" onSubmit={handleSubmit}>
            <label htmlFor="judge-text">지금 어떤 생각을 하고 계신가요?</label>
            <textarea
              id="judge-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="오늘의 생각을 적어보세요."
              maxLength={600}
              aria-describedby="judge-help judge-message"
            />
            <p id="judge-help" className="judge-help">
              외모비하, 혐오, 욕설, 개인정보가 포함된 문장은 처리하지 않습니다.
            </p>
            {message && (
              <p id="judge-message" className="form-error" role="status">
                {message}
              </p>
            )}
            <CommonButton
              type="submit"
              disabled={!text.trim()}
              isLoading={isLoading}
              loadingLabel="한마디를 받고 있습니다..."
            >
              한마디 받아보기
            </CommonButton>
          </form>
        </div>
        <section className="surface-card judge-result" aria-label="결과 영역">
          <h2>{pageTitle}</h2>
          <p>{result?.seonbiAdvice ?? defaultResultMessage}</p>
          <h3>현대어 해석</h3>
          <p>{result?.modernTranslation ?? defaultResultMessage}</p>
          <h3>공유용 문구</h3>
          <p>{result?.shareText ?? defaultResultMessage}</p>
          <div className="judge-share-actions">
            <CommonButton
              type="button"
              variant="secondary"
              disabled={!canShareResult}
              onClick={handleCopyShareText}
            >
              공유 문구 복사
            </CommonButton>
            {canUseWebShare && (
              <CommonButton
                type="button"
                variant="primary"
                disabled={!canShareResult}
                onClick={handleShareResult}
              >
                공유하기
              </CommonButton>
            )}
          </div>
          {shareMessage && (
            <p className="disabled-notice judge-share-message" role="status">
              {shareMessage}
            </p>
          )}
        </section>
      </section>
    </AppLayout>
  )
}
