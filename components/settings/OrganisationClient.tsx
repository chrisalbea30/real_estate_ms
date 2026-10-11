'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField, SelectField, MoneyField, Switch, FormGrid, FormSection, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/app/AppProvider'
import { SettingsCard, SaveRow, Note } from '@/components/settings/SettingsCard'
import { COMMON_CURRENCIES } from '@/lib/currency'
import { MONTHS_LONG, cn } from '@/lib/format'
import { saveOrganisationAction } from '@/app/(app)/app/settings/actions'
import type { Organization } from '@/lib/types'

type LinkRow = { label: string; url: string }

function initial(org: Organization) {
  const s = org.settings ?? ({} as Organization['settings'])
  return {
    name: org.name,
    base_currency: s.base_currency ?? 'EUR',
    display_currencies: s.display_currencies ?? [],
    vat_rate: String(s.vat_rate ?? 0),
    prices_include_vat: s.prices_include_vat ?? true,
    fiscal_year_start_month: String(s.fiscal_year_start_month ?? 1),
    fire_extinguisher_days: String(s.alerts?.fire_extinguisher_days ?? 30),
    arrivals_window_days: String(s.alerts?.arrivals_window_days ?? 7),
    departures_window_days: String(s.alerts?.departures_window_days ?? 7),
    partner_hour_rate: String(s.partner_hour_rate ?? 0),
    external_links: (s.external_links ?? []).map((l) => ({ label: l.label ?? '', url: l.url ?? '' })) as LinkRow[],
  }
}

export function OrganisationClient({ org }: { org: Organization }) {
  const router = useRouter()
  const toast = useToast()
  const { can } = useApp()
  const editable = can('settings', 'edit')
  const [form, setForm] = useState(() => initial(org))
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initial(org)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dirty = JSON.stringify(form) !== snapshot
  const originalCurrency = org.settings?.base_currency ?? 'EUR'

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const currencyChoices = [...new Set([...COMMON_CURRENCIES, ...form.display_currencies, originalCurrency])]
  const toggleDisplay = (c: string) =>
    setForm((f) => ({ ...f, display_currencies: f.display_currencies.includes(c) ? f.display_currencies.filter((x) => x !== c) : [...f.display_currencies, c] }))

  const setLink = (i: number, patch: Partial<LinkRow>) => setForm((f) => ({ ...f, external_links: f.external_links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  const removeLink = (i: number) => setForm((f) => ({ ...f, external_links: f.external_links.filter((_, j) => j !== i) }))
  const addLink = () => setForm((f) => ({ ...f, external_links: [...f.external_links, { label: '', url: 'https://' }] }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    const res = await saveOrganisationAction({
      name: form.name,
      base_currency: form.base_currency,
      display_currencies: form.display_currencies,
      vat_rate: form.vat_rate,
      prices_include_vat: form.prices_include_vat,
      fiscal_year_start_month: form.fiscal_year_start_month,
      alerts: { fire_extinguisher_days: form.fire_extinguisher_days, arrivals_window_days: form.arrivals_window_days, departures_window_days: form.departures_window_days },
      partner_hour_rate: form.partner_hour_rate,
      external_links: form.external_links,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      setErrors(res.fieldErrors ?? {})
      return
    }
    setSnapshot(JSON.stringify(form))
    toast.success('Organisation settings saved')
    router.refresh()
  }

  return (
    <div>
      <PageHeader title="Organisation" subtitle="Name, currencies, VAT, fiscal year, alerts and links for the whole organisation." />
      {!editable && <Note className="mb-5">You can view these settings. Changing them needs the Settings → edit permission.</Note>}

      <form id="org-form" onSubmit={submit}>
        <fieldset disabled={!editable} className="contents min-w-0">
          <SettingsCard title="General" footer={editable && <SaveRow busy={busy} dirty={dirty} form="org-form" />}>
            <FormGrid>
              <FormError error={error} />
              <TextField label="Organisation name" required value={form.name} onChange={set('name')} error={errors.name} containerClassName="sm:col-span-2" placeholder="Seaview Resort Co." />

              <FormSection title="Currencies">
                <SelectField
                  label="Base currency"
                  value={form.base_currency}
                  onChange={(e) => setForm((f) => ({ ...f, base_currency: e.target.value, display_currencies: f.display_currencies.filter((c) => c !== e.target.value) }))}
                  options={currencyChoices}
                  error={errors.base_currency}
                  hint="Every amount is stored in this currency."
                />
                <div className="sm:col-span-2">
                  <div className="label">Display currencies</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currencyChoices
                      .filter((c) => c !== form.base_currency)
                      .map((c) => {
                        const on = form.display_currencies.includes(c)
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleDisplay(c)}
                            className={cn('badge border px-3 py-1.5 text-xs transition', on ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}
                          >
                            {c}
                          </button>
                        )
                      })}
                  </div>
                  <p className="mt-1 text-xs text-muted">Members can switch the display between the base currency and these, converted at the daily ECB rate.</p>
                  {errors.display_currencies && <p className="mt-1 text-xs text-danger">{errors.display_currencies}</p>}
                </div>
                {form.base_currency !== originalCurrency && (
                  <Note tone="warning" className="sm:col-span-2">
                    Changing the base currency from {originalCurrency} to {form.base_currency} does <strong>not</strong> convert amounts already stored. Existing figures keep their numbers and will be shown as {form.base_currency}. Only do this on a fresh organisation.
                  </Note>
                )}
              </FormSection>

              <FormSection title="Tax and fiscal year">
                <MoneyField label="VAT rate (%)" value={form.vat_rate} onChange={set('vat_rate')} min={0} max={100} step="0.01" error={errors.vat_rate} hint="Applied on invoices." />
                <div>
                  <div className="label">Prices include VAT</div>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3.5">
                    <Switch checked={form.prices_include_vat} onChange={(v) => setForm((f) => ({ ...f, prices_include_vat: v }))} label="Prices include VAT" disabled={!editable} />
                    <span className="text-sm text-ink-2">{form.prices_include_vat ? 'Room rates are VAT-inclusive; invoices split the VAT out.' : 'Room rates are net; VAT is added on invoices.'}</span>
                  </label>
                </div>
                <SelectField
                  label="Fiscal year starts in"
                  value={form.fiscal_year_start_month}
                  onChange={set('fiscal_year_start_month')}
                  options={MONTHS_LONG.map((m, i) => ({ value: String(i + 1), label: m }))}
                  error={errors.fiscal_year_start_month}
                  hint="Used by budgets and year-to-date figures."
                />
              </FormSection>

              <FormSection title="Alerts">
                <TextField label="Fire extinguisher warning (days before expiry)" type="number" inputMode="numeric" min={0} max={365} value={form.fire_extinguisher_days} onChange={set('fire_extinguisher_days')} error={errors['alerts.fire_extinguisher_days']} />
                <TextField label="Arrivals window (days)" type="number" inputMode="numeric" min={0} max={90} value={form.arrivals_window_days} onChange={set('arrivals_window_days')} error={errors['alerts.arrivals_window_days']} hint="“Arriving soon” on the dashboards." />
                <TextField label="Departures window (days)" type="number" inputMode="numeric" min={0} max={90} value={form.departures_window_days} onChange={set('departures_window_days')} error={errors['alerts.departures_window_days']} hint="“Departing soon” on the dashboards." />
              </FormSection>

              <FormSection title="Partners">
                <MoneyField label="Partner hour rate" currency={form.base_currency} value={form.partner_hour_rate} onChange={set('partner_hour_rate')} min={0} step="0.01" error={errors.partner_hour_rate} hint="Default rate for partner work hours; a partner profile can override it." />
              </FormSection>

              <FormSection title="External links">
                <div className="sm:col-span-2">
                  <p className="mb-3 text-xs text-muted">Shortcuts shown on the Guests page, for example the immigration (TM30) portal or your channel manager.</p>
                  <div className="space-y-2">
                    {form.external_links.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_2fr_auto]">
                        <TextField aria-label="Label" placeholder="Label (e.g. Immigration portal)" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} error={errors[`external_links.${i}.label`]} containerClassName="col-span-2 sm:col-span-1" />
                        <TextField aria-label="URL" type="url" placeholder="https://…" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} error={errors[`external_links.${i}.url`]} />
                        <button type="button" className="icon-btn text-danger" onClick={() => removeLink(i)} title="Remove link" disabled={!editable}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-secondary btn-sm mt-3" onClick={addLink} disabled={!editable || form.external_links.length >= 20}>
                    <Plus className="h-4 w-4" /> Add link
                  </button>
                </div>
              </FormSection>
            </FormGrid>
          </SettingsCard>
        </fieldset>
      </form>
    </div>
  )
}
