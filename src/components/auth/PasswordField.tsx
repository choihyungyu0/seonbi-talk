import { useState, type InputHTMLAttributes } from 'react'
import { CommonButton } from '../common/CommonButton'
import { FormErrorMessage } from './FormErrorMessage'

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function PasswordField({
  label,
  id,
  error,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? props.name

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="password-field">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          {...props}
        />
        <CommonButton
          type="button"
          variant="ghost"
          className="password-toggle"
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? '숨기기' : '보기'}
        </CommonButton>
      </div>
      <FormErrorMessage message={error} />
    </div>
  )
}
