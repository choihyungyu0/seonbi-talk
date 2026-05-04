import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CommonButton } from '../components/common/CommonButton'
import { ProtectedFeaturePrompt } from '../components/common/ProtectedFeaturePrompt'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { trackEvent } from '../features/analytics/trackEvent'
import { requestSeonbiAdvice } from '../features/judge/judgeApi'
import { saveJudgeHistory } from '../features/judge/judgeHistoryApi'
import { saveLatestMindTags } from '../features/judge/latestMindTagsStorage'
import {
  getJudgeModeOption,
  getSeonbiVisualImageAlt,
  getSeonbiVisualImagePath,
  judgeModeOptions,
} from '../features/judge/judgeModes'
import type {
  JudgeAnalysis,
  JudgeMode,
  JudgeRagReference,
  JudgeResult,
} from '../features/judge/judgeTypes'
import type { SeonbiTypeInfo, TestResult } from '../features/seonbi-test/types'
import { loadTestResult } from '../lib/storage'

const defaultResultMessage = '고민을 적거나 사진을 올리면 선비의 한마디가 표시됩니다.'
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageDimension = 1024
const maxImageDataUrlLength = 1_100_000

export function JudgePage() {
  const testResult = loadTestResult()
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null

  if (!testResult || !typeInfo) {
    return (
      <AppLayout>
        <section className="page-section page-container judge-page">
          <ProtectedFeaturePrompt description="테스트 결과에 따라 선비의 한마디가 달라집니다." />
        </section>
      </AppLayout>
    )
  }

  return <JudgePageContent testResult={testResult} typeInfo={typeInfo} />
}

interface JudgePageContentProps {
  testResult: TestResult
  typeInfo: SeonbiTypeInfo
}

function JudgePageContent({ testResult, typeInfo }: JudgePageContentProps) {
  const [text, setText] = useState('')
  const [judgeMode, setJudgeMode] = useState<JudgeMode>('default')
  const [failedSeonbiImageSrc, setFailedSeonbiImageSrc] = useState('')
  const [result, setResult] = useState<JudgeResult | null>(null)
  const [ragReferences, setRagReferences] = useState<JudgeRagReference[]>([])
  const [message, setMessage] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageMimeType, setImageMimeType] = useState('')
  const pageTitle = typeInfo ? `${typeInfo.name} 선비의 한마디` : '선비의 한마디'
  const canShareResult = Boolean(result)
  const canUseWebShare = typeof navigator.share === 'function'
  const hasImage = Boolean(imageDataUrl)
  const selectedModeOption = getJudgeModeOption(judgeMode)
  const seonbiImageSrc = getSeonbiVisualImagePath(testResult.type, judgeMode)
  const seonbiImageAlt = getSeonbiVisualImageAlt(typeInfo.name, judgeMode)
  const hasSeonbiImageError = failedSeonbiImageSrc === seonbiImageSrc
  const modeDescription = selectedModeOption.description
  const analysisTags = getAnalysisTags(result?.analysis)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedText = text.trim()
    if (!trimmedText && !imageDataUrl) {
      setMessage('고민을 적거나 사진을 올려주세요.')
      setResult(null)
      setRagReferences([])
      return
    }

    setIsLoading(true)
    setMessage('')
    setShareMessage('')

    const response = await requestSeonbiAdvice({
      text: trimmedText,
      seonbiType: testResult.type,
      judgeMode,
      imageDataUrl: imageDataUrl || undefined,
      imageMimeType: imageMimeType || undefined,
    })

    if (!response.ok || !response.result) {
      setResult(null)
      setRagReferences([])
      setMessage(
        response.message ??
          '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
      setIsLoading(false)
      return
    }

    setResult(response.result)
    saveLatestMindTags(response.result.analysis)
    setRagReferences((response.ragReferences ?? []).slice(0, 3))
    void saveJudgeHistory({
      seonbiType: testResult.type,
      result: response.result,
      judgeMode,
      hasImage,
      hasText: Boolean(trimmedText),
    })
    void trackEvent('judge_used', {
      seonbiType: testResult.type,
      metadata: {
        hasSeonbiType: true,
        hasText: Boolean(trimmedText),
        hasImage,
        judgeMode,
      },
    })
    if (hasImage) {
      void trackEvent('judge_image_used', {
        seonbiType: testResult.type,
        metadata: {
          hasImage: true,
          hasText: Boolean(trimmedText),
          judgeMode,
        },
      })
    }
    setIsLoading(false)
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setMessage('')
    setIsProcessingImage(true)

    try {
      const processedImage = await resizeImageFile(file)
      setImageDataUrl(processedImage.dataUrl)
      setImageMimeType(processedImage.mimeType)
    } catch (error) {
      setImageDataUrl('')
      setImageMimeType('')
      setMessage(
        error instanceof Error
          ? error.message
          : '이미지 용량이 큽니다. 더 작은 이미지를 올려주세요.',
      )
    } finally {
      setIsProcessingImage(false)
      event.target.value = ''
    }
  }

  function handleRemoveImage() {
    setImageDataUrl('')
    setImageMimeType('')
  }

  async function handleCopyShareText() {
    if (!result) return

    void trackEvent('judge_share_clicked', {
      seonbiType: testResult.type,
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
      seonbiType: testResult.type,
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
          <div className={`wisdom-visual wisdom-visual--${judgeMode}`}>
            <div className="wisdom-visual-badges">
              <StatusBadge tone="brown">{typeInfo.name}</StatusBadge>
              <StatusBadge>{selectedModeOption.badge}</StatusBadge>
            </div>
            {!hasSeonbiImageError ? (
              <img
                src={seonbiImageSrc}
                alt={seonbiImageAlt}
                onError={() => setFailedSeonbiImageSrc(seonbiImageSrc)}
              />
            ) : (
              <span className="wisdom-visual-fallback" aria-hidden="true">
                書
              </span>
            )}
            <div className="wisdom-visual-info">
              <h2>{typeInfo.name} 선비</h2>
              <p>현재 모드: {selectedModeOption.badge}</p>
              <p>{modeDescription}</p>
            </div>
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
            <fieldset className="judge-mode-field">
              <legend>한마디 분위기 선택</legend>
              <div className="judge-mode-options">
                {judgeModeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={option.id === judgeMode ? 'active' : ''}
                    aria-pressed={option.id === judgeMode}
                    title={option.description}
                    onClick={() => setJudgeMode(option.id)}
                  >
                    {option.badge}
                  </button>
                ))}
              </div>
              <p className="judge-selected-mode">
                선택한 분위기: {selectedModeOption.badge} — {modeDescription}
              </p>
            </fieldset>
            <div className="judge-image-field">
              <div>
                <p className="judge-image-title">사진으로도 한마디를 받을 수 있습니다.</p>
                <p className="judge-help">
                  사진을 올리면 선비가 장면을 보고 한마디를 건넵니다.
                </p>
              </div>
              <input
                className="visually-hidden"
                id="judge-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <label className="judge-upload-box" htmlFor="judge-image">
                <span aria-hidden="true">+</span>
                <strong>사진 올리기</strong>
                <small>JPG, PNG, WebP 지원 · 선택 사항</small>
              </label>
              {isProcessingImage && (
                <p className="disabled-notice" role="status">
                  이미지를 준비하고 있습니다.
                </p>
              )}
              {imageDataUrl && (
                <figure className="judge-image-preview">
                  <img src={imageDataUrl} alt="선택한 사진 미리보기" />
                  <figcaption>
                    <span>선택한 사진</span>
                    <button type="button" onClick={handleRemoveImage}>
                      이미지 제거
                    </button>
                  </figcaption>
                </figure>
              )}
            </div>
            {message && (
              <p id="judge-message" className="form-error" role="status">
                {message}
              </p>
            )}
            <CommonButton
              type="submit"
              disabled={isProcessingImage || (!text.trim() && !imageDataUrl)}
              isLoading={isLoading}
              loadingLabel="한마디를 받고 있습니다..."
              fullWidth
              className="judge-submit-button"
            >
              한마디 받아보기
            </CommonButton>
          </form>
        </div>
        <section className="surface-card judge-result" aria-label="결과 영역">
          {result ? (
            <>
              <h2>선비의 한마디</h2>
              <p>{result.seonbiAdvice}</p>
              {result.imageObservation && (
                <>
                  <h3>사진에서 읽은 분위기</h3>
                  <p>{result.imageObservation}</p>
                </>
              )}
              <h3>현대어 해석</h3>
              <p>{result.modernTranslation}</p>
              {analysisTags.length > 0 && (
                <div className="judge-ai-analysis">
                  <div>
                    <StatusBadge>AI 분석</StatusBadge>
                    <h3>AI가 읽어낸 마음</h3>
                    <p>입력한 문장에서 감정과 상황을 비식별 태그로 분석했습니다.</p>
                  </div>
                  <ul aria-label="AI가 읽어낸 마음 태그">
                    {analysisTags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ragReferences.length > 0 && (
                <div className="judge-rag-references">
                  <h3>AI가 함께 참고한 영주 이야기</h3>
                  <p>영주 관광 데이터와 선비 설정을 참고해 한마디를 구성했습니다.</p>
                  <ul aria-label="AI가 함께 참고한 영주 이야기">
                    {ragReferences.map((reference) => (
                      <li
                        key={`${reference.sourceType}:${reference.sourceId}`}
                        className="judge-rag-chip"
                      >
                        {reference.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <h3>공유용 문구</h3>
              <p>{result.shareText}</p>
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
            </>
          ) : (
            <div className="judge-empty-state">
              <StatusBadge tone="neutral">대기 중</StatusBadge>
              <h2>아직 받은 한마디가 없습니다.</h2>
              <p>{defaultResultMessage}</p>
            </div>
          )}
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

function getAnalysisTags(analysis: JudgeAnalysis | undefined) {
  return [analysis?.emotionTag, analysis?.situationTag, analysis?.adviceTag]
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag))
}

async function resizeImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지만 올릴 수 있습니다.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('이미지를 처리하지 못했습니다. 다른 이미지를 올려주세요.')
  }

  context.drawImage(image, 0, 0, width, height)

  const outputMimeType = file.type === 'image/png' ? 'image/jpeg' : file.type
  const dataUrl = canvas.toDataURL(outputMimeType, 0.82)

  if (dataUrl.length > maxImageDataUrlLength) {
    throw new Error('이미지 용량이 큽니다. 더 작은 이미지를 올려주세요.')
  }

  return {
    dataUrl,
    mimeType: outputMimeType,
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
      image.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}
