import { useEffect, useState } from 'react'
import seonbiAiAvatar from '../assets/seonbi-ai-avatar.png'
import { SeonbiChatbotButton } from './chat/SeonbiChatbotButton'
import { BrandLoading } from './common/BrandLoading'
import { loadLatestMindTags } from '../features/judge/latestMindTagsStorage'
import { loadTestResult } from '../lib/storage'

type ChatRole = 'assistant' | 'user'
type ChatStatus = 'idle' | 'loading' | 'error'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  references?: RagChatReference[]
}

interface RagChatReference {
  title: string
}

interface RagChatResponse {
  ok?: boolean
  answer?: string
  message?: string
  references?: RagChatReference[]
}

const suggestedQuestions = [
  '소수서원은 어떤 곳이야?',
  '내 선비유형에 맞는 코스 추천해줘',
  '비 오는 날 갈 만한 영주 코스 알려줘',
  '오늘의 선비길 일정을 설명해줘',
]

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: '영주 관광과 선비유형에 대해 물어보세요. 확인된 데이터 안에서 차분히 안내해드릴게요.',
  },
]

export function FloatingRagChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ChatStatus>('idle')

  useEffect(() => {
    if (!isOpen) return undefined

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  async function submitMessage(message: string) {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || status === 'loading') return

    setInput('')
    setStatus('loading')
    setMessages((current) => [
      ...current,
      createMessage('user', trimmedMessage),
    ])

    try {
      const context = getChatContext()
      const response = await fetch('/api/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          ...context,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as RagChatResponse

      if (!response.ok || !data.ok || !data.answer) {
        throw new Error(data.message ?? 'chat_failed')
      }

      const answer = data.answer
      setMessages((current) => [
        ...current,
        createMessage('assistant', answer, getPublicReferences(data.references)),
      ])
      setStatus('idle')
    } catch {
      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          '지금은 답변을 불러오지 못했습니다. 추천 코스나 선비의 한마디 화면을 먼저 확인해보세요.',
        ),
      ])
      setStatus('error')
    }
  }

  return (
    <div className="floating-rag-chatbot">
      {isOpen && (
        <section className="rag-chat-panel" aria-label="선비길 AI 길잡이">
          <div className="rag-chat-header">
            <div className="rag-chat-header-profile">
              <img src={seonbiAiAvatar} alt="영주 선비 AI 챗봇" />
              <div>
                <span>선비 AI</span>
                <h2>영주 선비 AI</h2>
                <p>영주 여행이 궁금하신가요?</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="선비길 AI 길잡이 닫기"
              onClick={() => setIsOpen(false)}
            >
              닫기
            </button>
          </div>
          <div className="rag-chat-subtitle">
            <div>
              <span aria-hidden="true">AI</span>
              <h2>선비길 AI 길잡이</h2>
              <p>영주 관광과 선비유형에 대해 물어보세요.</p>
            </div>
          </div>

          <div className="rag-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                className={
                  message.role === 'user'
                    ? 'rag-chat-message-group rag-chat-message-group--user'
                    : 'rag-chat-message-group'
                }
                key={message.id}
              >
                <p
                  className={
                    message.role === 'user'
                      ? 'rag-chat-message rag-chat-message--user'
                      : 'rag-chat-message'
                  }
                >
                  {message.text}
                </p>
                {message.role === 'assistant' && Boolean(message.references?.length) && (
                  <div className="rag-chat-references" aria-label="참고한 영주 데이터">
                    <strong>참고한 영주 데이터</strong>
                    <ul>
                      {message.references?.map((reference) => (
                        <li key={reference.title}>{reference.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {status === 'loading' && (
              <div className="rag-chat-message rag-chat-loading-message">
                <BrandLoading message="AI 선비가 답을 고르는 중입니다." compact />
                <span>답변을 준비하고 있습니다.</span>
              </div>
            )}
          </div>

          <div className="rag-chat-suggestions" aria-label="추천 질문">
            {suggestedQuestions.map((question) => (
              <button
                type="button"
                key={question}
                disabled={status === 'loading'}
                onClick={() => void submitMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form
            className="rag-chat-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submitMessage(input)
            }}
          >
            <label className="visually-hidden" htmlFor="rag-chat-input">
              선비길 AI 길잡이 질문
            </label>
            <input
              id="rag-chat-input"
              type="text"
              maxLength={500}
              placeholder="영주 여행이나 선비유형을 물어보세요"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={!input.trim() || status === 'loading'}>
              전송
            </button>
          </form>
        </section>
      )}
      {!isOpen && (
        <SeonbiChatbotButton isOpen={isOpen} onClick={() => setIsOpen(true)} />
      )}
    </div>
  )
}

function createMessage(
  role: ChatRole,
  text: string,
  references: RagChatReference[] = [],
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    references,
  }
}

function getPublicReferences(references: RagChatReference[] | undefined) {
  if (!references?.length) return []

  const seenTitles = new Set<string>()
  const publicReferences: RagChatReference[] = []

  for (const reference of references) {
    const title = reference.title.replace(/\s+/g, ' ').trim()
    if (!title || seenTitles.has(title)) continue

    seenTitles.add(title)
    publicReferences.push({ title })
    if (publicReferences.length >= 3) break
  }

  return publicReferences
}

function getChatContext() {
  const testResult = loadTestResult()
  const mindTags = loadLatestMindTags()

  return {
    seonbiType: testResult?.type,
    emotionTag: mindTags?.emotionTag,
    situationTag: mindTags?.situationTag,
    adviceTag: mindTags?.adviceTag,
  }
}
