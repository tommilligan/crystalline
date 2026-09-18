import { describe, expect, it } from 'vitest'
import type { RatingProperty } from './board'
import { emptyScoreSet, totalScore } from './board'

const PROPERTIES: RatingProperty[] = [
  { id: 'people', label: 'People' },
  { id: 'time', label: 'Time' },
  { id: 'money', label: 'Money' },
  { id: 'quality', label: 'Quality' },
  { id: 'service', label: 'Service' },
  { id: 'price', label: 'Price' },
]

describe('totalScore', () => {
  it('returns null when no scores have been set', () => {
    expect(totalScore(null, PROPERTIES)).toBeNull()
  })

  it('sums all configured properties', () => {
    const scores = { people: 3, time: 3, money: 5, quality: 1, service: 1, price: 5 }
    expect(totalScore(scores, PROPERTIES)).toBe(18)
  })

  it('starts with no properties scored', () => {
    expect(emptyScoreSet()).toEqual({})
  })

  it('sums only the properties scored so far, ignoring the rest', () => {
    expect(totalScore({ people: 4, money: 2 }, PROPERTIES)).toBe(6)
  })

  it('treats a single scored property as not affecting the others', () => {
    const scores: Record<string, number> = { people: 5 }
    expect(scores.time).toBeUndefined()
    expect(scores.money).toBeUndefined()
  })

  it('ignores a score left over from a property no longer in the current list', () => {
    expect(totalScore({ people: 4, removedProperty: 5 }, PROPERTIES)).toBe(4)
  })
})
