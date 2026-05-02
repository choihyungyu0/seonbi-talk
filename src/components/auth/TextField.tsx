import type { InputHTMLAttributes } from 'react'
import { FormErrorMessage } from './FormErrorMessage'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, id, error, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} aria-invalid={Boolean(error)} {...props} />
      <FormErrorMessage message={error} />
    </div>
  )
}
