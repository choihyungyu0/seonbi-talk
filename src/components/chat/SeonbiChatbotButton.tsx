import seonbiAiAvatar from '../../assets/seonbi-ai-avatar.png'

interface SeonbiChatbotButtonProps {
  isOpen: boolean
  onClick: () => void
}

export function SeonbiChatbotButton({
  isOpen,
  onClick,
}: SeonbiChatbotButtonProps) {
  return (
    <button
      type="button"
      className="seonbi-chatbot-button"
      aria-expanded={isOpen}
      aria-label="선비길 AI 길잡이 열기"
      onClick={onClick}
    >
      <span className="seonbi-chatbot-button__bubble" aria-hidden="true">
        영주 여행이 궁금하신가요?
      </span>
      <span className="seonbi-chatbot-button__avatar">
        <img src={seonbiAiAvatar} alt="영주 선비 AI 챗봇" />
      </span>
      <span className="seonbi-chatbot-button__name" aria-hidden="true">
        선비 AI
      </span>
    </button>
  )
}
