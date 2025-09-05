export const ADMIN_EMAILS = [
  'zak26.mb@gmail.com'
]

export function isAdmin(email: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
