'use client'

import { useId } from 'react'
import { cn } from '@/lib/format'

interface FieldProps {
  label?: React.ReactNode
  error?: string
  hint?: React.ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, error, hint, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

type Base = { label?: React.ReactNode; error?: string; hint?: React.ReactNode; containerClassName?: string }

export function TextField({ label, error, hint, containerClassName, className, required, id, ...rest }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={containerClassName}>
      <input id={fid} className={cn('input', error && 'border-danger focus:border-danger focus:ring-danger/15', className)} required={required} {...rest} />
    </Field>
  )
}

export function MoneyField({ label, error, hint, containerClassName, className, currency, required, id, ...rest }: Base & { currency?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={containerClassName}>
      <div className="relative">
        {currency && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-muted">{currency}</span>}
        <input
          id={fid}
          type="number"
          inputMode="decimal"
          step="0.01"
          className={cn('input tabular', currency && 'pl-14', error && 'border-danger', className)}
          required={required}
          {...rest}
        />
      </div>
    </Field>
  )
}

export function SelectField({
  label,
  error,
  hint,
  containerClassName,
  className,
  options,
  placeholder,
  required,
  id,
  ...rest
}: Base & { options: Array<string | { value: string; label: string }>; placeholder?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={containerClassName}>
      <select id={fid} className={cn('select', error && 'border-danger', className)} required={required} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {l}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

export function TextareaField({ label, error, hint, containerClassName, className, required, id, ...rest }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={fid} className={containerClassName}>
      <textarea id={fid} className={cn('textarea', error && 'border-danger', className)} required={required} {...rest} />
    </Field>
  )
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 hover:bg-surface-2 transition', disabled && 'opacity-60', className)}>
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 rounded border-line-2 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-primary' : 'bg-line-2')}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  )
}

/** Two-column form grid that collapses to one column on phones. */
export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>
}

export function FormSection({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('sm:col-span-2', className)}>
      <h3 className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function FormError({ error }: { error?: string | null }) {
  if (!error) return null
  return <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger sm:col-span-2">{error}</div>
}
