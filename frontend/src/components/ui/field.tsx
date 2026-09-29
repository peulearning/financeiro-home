import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string }) => ReactNode;
}

export function Field({ label, error, hint, required, children }: FieldWrapperProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-expense">*</span>}
        </label>
      )}
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} className="mt-1 flex items-center gap-1 text-xs text-expense">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  label,
  error,
  hint,
  required,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`field ${error ? 'field-error' : ''} ${className}`}
          {...rest}
        />
      )}
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  required,
  children,
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`field ${error ? 'field-error' : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function Textarea({
  label,
  error,
  hint,
  required,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`field resize-y min-h-20 ${error ? 'field-error' : ''} ${className}`}
          {...rest}
        />
      )}
    </Field>
  );
}
