import { describe, it, expect } from 'vitest'
import { 
  validateEmail, 
  validatePassword, 
  validateDisplayName, 
  validatePlayerName,
  validatePlayerPrice,
  combineValidations
} from '../validation'

describe('validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin@company.org'
      ]

      validEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain'
      ]

      invalidEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validatePassword', () => {
    it('should validate correct passwords', () => {
      const validPasswords = [
        'password123',
        'mypassword',
        '123456'
      ]

      validPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject short passwords', () => {
      const shortPasswords = [
        '',
        '12345',
        'pass'
      ]

      shortPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validatePlayerName', () => {
    it('should validate correct player names', () => {
      const validNames = [
        'John Smith',
        'O\'Connor',
        'Jean-Pierre',
        'Van Der Berg'
      ]

      validNames.forEach(name => {
        const result = validatePlayerName(name)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject invalid player names', () => {
      const invalidNames = [
        '',
        'A',
        'John123',
        'John@Smith',
        'John#Smith'
      ]

      invalidNames.forEach(name => {
        const result = validatePlayerName(name)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validatePlayerPrice', () => {
    it('should validate correct prices', () => {
      const validPrices = [3.5, 5.0, 10.5, 15.0]

      validPrices.forEach(price => {
        const result = validatePlayerPrice(price)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should reject invalid prices', () => {
      const invalidPrices = [3.4, 15.1, 3.55, 0, 3.51]

      invalidPrices.forEach(price => {
        const result = validatePlayerPrice(price)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('combineValidations', () => {
    it('should combine multiple validation results', () => {
      const validation1 = { isValid: true, errors: [] }
      const validation2 = { isValid: false, errors: ['Error 1'] }
      const validation3 = { isValid: false, errors: ['Error 2'] }

      const result = combineValidations(validation1, validation2, validation3)

      expect(result.isValid).toBe(false)
      expect(result.errors).toEqual(['Error 1', 'Error 2'])
    })

    it('should return valid when all validations pass', () => {
      const validation1 = { isValid: true, errors: [] }
      const validation2 = { isValid: true, errors: [] }

      const result = combineValidations(validation1, validation2)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
