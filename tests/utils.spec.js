import { describe, expect, it, vi } from 'vitest'
import { formatMoney, formatNumber } from '../src/utils/format'
import { loadJson, saveJson } from '../src/utils/storage'

describe('formatMoney', () => {
  it('formateaza fiecare moneda suportata', () => {
    expect(formatMoney(1234.5, 'EUR')).toMatch(/1\.234,50\s(€|EUR)/)
    expect(formatMoney(10, 'USD')).toContain('USD')
    expect(formatMoney(10, 'RON')).toContain('RON')
  })

  it('considera 0 valorile null, undefined si goale', () => {
    const zero = formatMoney(0, 'EUR')
    expect(formatMoney(null, 'EUR')).toBe(zero)
    expect(formatMoney(undefined, 'EUR')).toBe(zero)
    expect(formatMoney('', 'EUR')).toBe(zero)
  })

  it('rotunjeste la 2 zecimale', () => {
    expect(formatMoney(1.239, 'EUR')).toMatch(/1,24/)
  })
})

describe('formatNumber', () => {
  it('pastreaza pana la 8 zecimale pentru cantitati crypto', () => {
    expect(formatNumber(0.12345678)).toBe('0,12345678')
    expect(formatNumber(0.123456789)).toBe('0,12345679')
  })

  it('considera 0 valorile lipsa', () => {
    expect(formatNumber(undefined)).toBe('0')
  })
})

describe('stocare', () => {
  it('salveaza si citeste JSON', () => {
    saveJson('k', { a: [1, 2] })
    expect(loadJson('k', null)).toEqual({ a: [1, 2] })
  })

  it('returneaza valoarea implicita pentru chei lipsa', () => {
    expect(loadJson('missing', 'fb')).toBe('fb')
  })

  it('returneaza valoarea implicita pentru JSON corupt', () => {
    localStorage.setItem('bad', '{not json')
    expect(loadJson('bad', [])).toEqual([])
  })

  it('nu arunca eroare cand localStorage e plin sau blocat', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveJson('k', 1)).not.toThrow()
  })

  it('nu arunca eroare cand citirea din localStorage e blocata', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadJson('k', 'fb')).toBe('fb')
  })
})
