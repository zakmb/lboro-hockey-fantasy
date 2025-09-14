import { describe, it, expect } from 'vitest'
import { isAdmin, ADMIN_EMAILS } from '../adminEmails'

describe('adminEmails', () => {
  describe('ADMIN_EMAILS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ADMIN_EMAILS)).toBe(true)
    })

    it('should contain valid email addresses', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      ADMIN_EMAILS.forEach(email => {
        expect(emailRegex.test(email)).toBe(true)
      })
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin emails', () => {
      ADMIN_EMAILS.forEach(email => {
        expect(isAdmin(email)).toBe(true)
      })
    })

    it('should return false for non-admin emails', () => {
      const nonAdminEmails = [
        'user@example.com',
        'test@gmail.com',
        'random@yahoo.com'
      ]

      nonAdminEmails.forEach(email => {
        expect(isAdmin(email)).toBe(false)
      })
    })

    it('should return false for undefined email', () => {
      expect(isAdmin(null)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAdmin('')).toBe(false)
    })

    it('should be case insensitive', () => {
      if (ADMIN_EMAILS.length > 0) {
        const adminEmail = ADMIN_EMAILS[0]
        const upperCaseEmail = adminEmail.toUpperCase()
        const lowerCaseEmail = adminEmail.toLowerCase()
        
        // Should work with different cases
        expect(isAdmin(upperCaseEmail)).toBe(true)
        expect(isAdmin(lowerCaseEmail)).toBe(true)
        expect(isAdmin(adminEmail)).toBe(true)
      }
    })
  })
})
