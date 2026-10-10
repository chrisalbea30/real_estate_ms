import type { Action, ModuleKey } from '@/lib/modules'
import type { Permissions } from '@/lib/types'

export function hasPerm(perms: Permissions | null | undefined, module: ModuleKey, action: Action): boolean {
  return Boolean(perms?.[module]?.[action])
}

export function firstViewable(perms: Permissions | null | undefined, modules: { key: ModuleKey; href: string }[]): string {
  const m = modules.find((x) => hasPerm(perms, x.key, 'view'))
  return m?.href ?? '/app/settings/profile'
}
