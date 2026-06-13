import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CommonButton } from '../components/common/CommonButton'
import { BrandLoading } from '../components/common/BrandLoading'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { trackEvent } from '../features/analytics/trackEvent'
import { requestSeonbiAdvice } from '../features/judge/judgeApi'
import { saveJudgeHistory } from '../features/judge/judgeHistoryApi'
import { saveLatestMindTags } from '../features/judge/latestMindTagsStorage'
import {
  getJudgeModeOption,
  getSeonbiVisualImagePreloadPaths,
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
import type { SeonbiType, SeonbiTypeInfo } from '../features/seonbi-test/types'
import { loadTestResult } from '../lib/storage'

const defaultAdvice = '고요한 물은 깊이 흐르고, 작은 배움은 큰 길이 되나니.'
const defaultModernTranslation = '지금의 작은 노력과 배움이 쌓여, 결국 큰 성취로 이어질 것입니다.'
const defaultAnalysisTags = ['호기심', '배움', '소통']
const judgeAssetPath = (fileName: string) => `/images/judge/${encodeURI(fileName)}`
const judgeIconPaths = {
  book: judgeAssetPath('image-Photoroom (8).png'),
  copy: judgeAssetPath('image-Photoroom (9).png'),
  frame: judgeAssetPath('image-removebg-preview (19).png'),
  heroCloud: judgeAssetPath('image-removebg-preview (22).png'),
  imageTitle: judgeAssetPath('image-Photoroom (20).png'),
  modernScroll: judgeAssetPath('image-Photoroom (7).png'),
  mood: judgeAssetPath('image-Photoroom (4).png'),
  people: judgeAssetPath('image-Photoroom (18).png'),
  referenceBook: judgeAssetPath('image-Photoroom (5).png'),
  referencePlace: judgeAssetPath('image-removebg-preview (20).png'),
  search: judgeAssetPath('image-Photoroom (6).png'),
  section: judgeAssetPath('image-Photoroom (20).png'),
  send: judgeAssetPath('image-Photoroom (22).png'),
  share: judgeAssetPath('image-Photoroom (17).png'),
  thought: judgeAssetPath('image-Photoroom (14).png'),
  upload: judgeAssetPath('+.png'),
} as const
const judgeModeVisuals: Record<JudgeMode, { badge: string; iconSrc: string }> = {
  default: {
    badge: '기본',
    iconSrc: judgeAssetPath('image-Photoroom (3).png'),
  },
  strict: {
    badge: '엄격',
    iconSrc: judgeAssetPath('image-Photoroom (10).png'),
  },
  practical: {
    badge: '현실',
    iconSrc: judgeAssetPath('image-Photoroom (11).png'),
  },
  hermit: {
    badge: '은둔',
    iconSrc: judgeAssetPath('image-Photoroom (12).png'),
  },
  righteous: {
    badge: '의병',
    iconSrc: judgeAssetPath('image-Photoroom (13).png'),
  },
  praise: {
    badge: '칭찬',
    iconSrc: judgeAssetPath('image-Photoroom (4).png'),
  },
  roast: {
    badge: '팩폭',
    iconSrc: judgeAssetPath('image-Photoroom (9).png'),
  },
  petition: {
    badge: '상소문',
    iconSrc: judgeAssetPath('image-Photoroom (15).png'),
  },
  poison: {
    badge: '사약',
    iconSrc: judgeAssetPath('image-Photoroom (16).png'),
  },
}
const defaultJudgeReferenceCards = [
  {
    id: 'reference-place',
    title: '엄격한 선비',
    iconSrc: judgeIconPaths.referencePlace,
  },
  {
    id: 'reference-book',
    title: '기본 선비',
    iconSrc: judgeIconPaths.referenceBook,
  },
]
const seonbiExperienceTypes: SeonbiType[] = ['toegye', 'yulgok', 'cheosa', 'uguk']
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageDimension = 1024
const maxImageDataUrlLength = 1_100_000

export function JudgePage() {
  const testResult = loadTestResult()
  const [selectedSeonbiType, setSelectedSeonbiType] = useState<SeonbiType>(
    testResult?.type ?? 'toegye',
  )
  const typeInfo = seonbiTypeInfo[selectedSeonbiType]

  return (
    <JudgePageContent
      seonbiType={selectedSeonbiType}
      typeInfo={typeInfo}
      hasTestResult={Boolean(testResult)}
      onSelectSeonbiType={setSelectedSeonbiType}
    />
  )
}

interface JudgePageContentProps {
  seonbiType: SeonbiType
  typeInfo: SeonbiTypeInfo
  hasTestResult: boolean
  onSelectSeonbiType: (seonbiType: SeonbiType) => void
}

function JudgePageContent({
  seonbiType,
  typeInfo,
  hasTestResult,
  onSelectSeonbiType,
}: JudgePageContentProps) {
  const [text, setText] = useState('')
  const [judgeMode, setJudgeMode] = useState<JudgeMode>('default')
  const [failedSeonbiImageSrc, setFailedSeonbiImageSrc] = useState('')
  const [isSeonbiImageLoaded, setIsSeonbiImageLoaded] = useState(false)
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
  const seonbiImageSrc = getSeonbiVisualImagePath(seonbiType, judgeMode)
  const seonbiImageAlt = getSeonbiVisualImageAlt(typeInfo.name, judgeMode)
  const hasSeonbiImageError = failedSeonbiImageSrc === seonbiImageSrc
  const modeDescription = selectedModeOption.description
  const analysisTags = result ? getAnalysisTags(result.analysis) : defaultAnalysisTags
  const displayedAdvice = result?.seonbiAdvice ?? defaultAdvice
  const displayedTranslation = result?.modernTranslation ?? defaultModernTranslation
  const displayedShareText =
    result?.shareText ?? `${typeInfo.name} 선비의 한마디: ${defaultAdvice}`
  const referenceCards =
    ragReferences.length > 0
      ? ragReferences.map((reference) => ({
          id: `${reference.sourceType}:${reference.sourceId}`,
          title: reference.title,
          iconSrc: judgeIconPaths.referencePlace,
        }))
      : defaultJudgeReferenceCards

  useEffect(() => {
    const preloadedImages = getSeonbiVisualImagePreloadPaths(seonbiType).map(
      (imagePath) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = imagePath
        return image
      },
    )

    return () => {
      preloadedImages.forEach((image) => {
        image.onload = null
        image.onerror = null
      })
    }
  }, [seonbiType])

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
      seonbiType,
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
      seonbiType,
      result: response.result,
      judgeMode,
      hasImage,
      hasText: Boolean(trimmedText),
    })
    void trackEvent('judge_used', {
      seonbiType,
      metadata: {
        hasSeonbiType: true,
        seonbiTypeSource: hasTestResult ? 'test_result' : 'preview',
        hasText: Boolean(trimmedText),
        hasImage,
        judgeMode,
      },
    })
    if (hasImage) {
      void trackEvent('judge_image_used', {
        seonbiType,
        metadata: {
          seonbiTypeSource: hasTestResult ? 'test_result' : 'preview',
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

  function handleJudgeModeChange(nextJudgeMode: JudgeMode) {
    setIsSeonbiImageLoaded(false)
    setFailedSeonbiImageSrc('')
    setJudgeMode(nextJudgeMode)
  }

  function handleSeonbiTypeChange(nextSeonbiType: SeonbiType) {
    if (nextSeonbiType === seonbiType) return

    setIsSeonbiImageLoaded(false)
    setFailedSeonbiImageSrc('')
    setResult(null)
    setRagReferences([])
    setMessage('')
    setShareMessage('')
    onSelectSeonbiType(nextSeonbiType)
  }

  async function handleCopyShareText() {
    void trackEvent('judge_share_clicked', {
      seonbiType,
      metadata: {
        method: 'copy',
      },
    })

    try {
      await navigator.clipboard.writeText(displayedShareText)
      setShareMessage('공유 문구를 복사했습니다.')
    } catch {
      setShareMessage('공유 문구를 복사하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  async function handleShareResult() {
    if (!result || !canUseWebShare) return

    void trackEvent('judge_share_clicked', {
      seonbiType,
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
    <AppLayout hideBottomNavigation>
      <section className="judge-page">
        <div className="judge-page-shell page-container">
          <header className="judge-hero">
            <StatusBadge>선비의 한마디</StatusBadge>
            <h1>
              <img src={judgeIconPaths.heroCloud} alt="" aria-hidden="true" />
              <span>{pageTitle}</span>
              <img src={judgeIconPaths.heroCloud} alt="" aria-hidden="true" />
            </h1>
            <p>
              {hasTestResult
                ? '오늘의 생각을 적으면, 선비가 마음을 담아 전해드립니다.'
                : '오늘의 생각을 적으면, 선비가 마음을 담아 전해드립니다.'}
            </p>
          </header>

          <div className="seonbi-experience-switcher" aria-label="선비 유형 체험">
            {seonbiExperienceTypes.map((experienceType) => {
              const experienceTypeInfo = seonbiTypeInfo[experienceType]

              return (
                <button
                  key={experienceType}
                  type="button"
                  className={experienceType === seonbiType ? 'active' : ''}
                  aria-pressed={experienceType === seonbiType}
                  onClick={() => handleSeonbiTypeChange(experienceType)}
                >
                  {experienceTypeInfo.name}
                </button>
              )
            })}
          </div>

          <div className="judge-workspace">
          <div className={`wisdom-visual wisdom-visual--${judgeMode}`}>
            <div className="wisdom-visual-badges">
              <StatusBadge tone="brown">{typeInfo.name}</StatusBadge>
              <StatusBadge>{judgeModeVisuals[judgeMode].badge}</StatusBadge>
            </div>
            {!hasSeonbiImageError ? (
              <>
                {!isSeonbiImageLoaded && (
                  <span className="wisdom-visual-loading" aria-hidden="true">
                    書
                  </span>
                )}
                <img
                  key={seonbiImageSrc}
                  className={isSeonbiImageLoaded ? 'is-loaded' : ''}
                  src={seonbiImageSrc}
                  alt={seonbiImageAlt}
                  width="720"
                  height="880"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onLoad={() => setIsSeonbiImageLoaded(true)}
                  onError={() => {
                    setIsSeonbiImageLoaded(false)
                    setFailedSeonbiImageSrc(seonbiImageSrc)
                  }}
                />
              </>
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
            <img
              className="wisdom-visual-frame"
              src={judgeIconPaths.frame}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
            />
          </div>
          <form className="surface-card judge-form" onSubmit={handleSubmit}>
            <div className="judge-field-block">
              <label className="judge-section-label" htmlFor="judge-text">
                <JudgeAssetIcon name="thought" />
                지금 어떤 생각을 하고 계신가요?
              </label>
              <div className="judge-textarea-wrap">
                <textarea
                  id="judge-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="오늘의 생각을 적어보세요."
                  maxLength={300}
                  aria-describedby="judge-text-count judge-message"
                />
                <span id="judge-text-count" className="judge-text-count">
                  {text.length} / 300
                </span>
              </div>
            </div>
            <fieldset className="judge-mode-field">
              <legend>
                <JudgeAssetIcon name="mood" />
                분위기 선택
              </legend>
              <div className="judge-mode-options">
                {judgeModeOptions.map((option) => {
                  const visual = judgeModeVisuals[option.id]

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === judgeMode ? 'active' : ''}
                      aria-pressed={option.id === judgeMode}
                      title={option.description}
                      onClick={() => handleJudgeModeChange(option.id)}
                    >
                      <img
                        className="judge-mode-option-icon"
                        src={visual.iconSrc}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                      />
                      {visual.badge}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="judge-image-field">
              <p className="judge-section-label judge-image-title">
                <JudgeAssetIcon name="imageTitle" />
                사진으로도 한마디 받기
              </p>
              <input
                className="visually-hidden"
                id="judge-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <label className="judge-upload-box" htmlFor="judge-image">
                <img src={judgeIconPaths.upload} alt="" aria-hidden="true" />
                <strong>이미지 업로드 (선택)</strong>
              </label>
              {isProcessingImage && (
                <BrandLoading
                  className="judge-inline-loading"
                  message="이미지를 준비하고 있습니다."
                  compact
                />
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
              disabled={isProcessingImage}
              isLoading={isLoading}
              loadingLabel="한마디 받는 중..."
              fullWidth
              className="judge-submit-button"
            >
              한마디 받기 <JudgeAssetIcon name="send" />
            </CommonButton>
            {isLoading && (
              <BrandLoading
                className="judge-inline-loading"
                message="AI 선비가 답을 고르는 중입니다."
              />
            )}
          </form>
          </div>

          <div className="judge-lower-grid">
            <section className="surface-card judge-result" aria-label="결과 영역">
              <blockquote className="judge-advice-quote">
                <span aria-hidden="true">“</span>
                <p>{displayedAdvice}</p>
                <span aria-hidden="true">”</span>
              </blockquote>
              {result?.imageObservation && (
                <div className="judge-image-observation">
                  <strong>사진에서 읽은 분위기</strong>
                  <p>{result.imageObservation}</p>
                </div>
              )}
              <div className="judge-result-body">
                <div className="judge-modern-card">
                  <img src={judgeIconPaths.modernScroll} alt="" aria-hidden="true" />
                  <div>
                    <strong>현대어 해석</strong>
                    <p>{displayedTranslation}</p>
                  </div>
                </div>
                <div className="judge-mind-card">
                  <strong>AI가 읽어낸 마음</strong>
                  <ul aria-label="AI가 읽어낸 마음 태그">
                    {analysisTags.map((tag) => (
                      <li key={tag}>
                        <JudgeAssetIcon name={getMindIconName(tag)} />
                        <span>{tag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="judge-share-actions">
                <CommonButton type="button" variant="secondary" onClick={handleCopyShareText}>
                  <JudgeAssetIcon name="copy" /> 공유 문구 복사
                </CommonButton>
                <CommonButton
                  type="button"
                  variant="primary"
                  disabled={!canShareResult || !canUseWebShare}
                  onClick={handleShareResult}
                >
                  <JudgeAssetIcon name="share" /> 공유하기
                </CommonButton>
              </div>
              {shareMessage && (
                <p className="disabled-notice judge-share-message" role="status">
                  {shareMessage}
                </p>
              )}
            </section>

            <aside className="surface-card judge-reference-card" aria-label="AI가 함께 참고한 영주 이야기">
              <h2>
                <JudgeAssetIcon name="book" />
                AI가 함께 참고한 영주 이야기
              </h2>
              <ul className="judge-reference-list">
                {referenceCards.map((reference) => (
                  <li key={reference.id}>
                    <img src={reference.iconSrc} alt="" aria-hidden="true" />
                    <span>{reference.title}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

type JudgeAssetIconName =
  | 'book'
  | 'copy'
  | 'imageTitle'
  | 'mood'
  | 'people'
  | 'search'
  | 'section'
  | 'send'
  | 'share'
  | 'thought'

function JudgeAssetIcon({ name }: { name: JudgeAssetIconName }) {
  return (
    <img
      className={`judge-icon judge-icon--${name}`}
      src={judgeIconPaths[name]}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  )
}

function getMindIconName(tag: string): JudgeAssetIconName {
  if (tag.includes('배움') || tag.includes('학문')) return 'book'
  if (tag.includes('소통') || tag.includes('관계')) return 'people'
  return 'search'
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
