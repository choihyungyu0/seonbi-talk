interface FormErrorMessageProps {
  message?: string
}

export function FormErrorMessage({ message }: FormErrorMessageProps) {
  if (!message) return null
  return <p className="form-error">{message}</p>
}
