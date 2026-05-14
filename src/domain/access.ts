import type { PersonaId } from './types'

/**
 * Central access policy. Every permission check in the app should reference
 * this file — never inline ad-hoc sets.
 *
 * null = all personas have access.
 */

export type Permission =
  | 'nav:deals'
  | 'nav:integrations'
  | 'nav:admin'
  | 'action:run_screening'
  | 'action:confirm_restriction'
  | 'action:approve_signoff'

const POLICY: Record<Permission, ReadonlySet<PersonaId>> = {
  'nav:deals':                new Set(['gp', 'compliance', 'legal', 'admin']),
  'nav:integrations':         new Set(['admin']),
  'nav:admin':                new Set(['admin']),
  'action:run_screening':     new Set(['gp', 'compliance', 'admin']),
  'action:confirm_restriction': new Set(['compliance', 'legal', 'admin']),
  'action:approve_signoff':   new Set(['compliance', 'legal', 'admin']),
}

export function can(persona: PersonaId, permission: Permission): boolean {
  return POLICY[permission].has(persona)
}

/** Returns true if this persona can access any of the given permissions. */
export function canAny(persona: PersonaId, ...permissions: Permission[]): boolean {
  return permissions.some((p) => can(persona, p))
}
