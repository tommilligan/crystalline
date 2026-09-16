import { describe, expect, it } from 'vitest'
import { emptyScoreSet, totalScore } from './board'

describe('totalScore', () => {
  it('returns null when no scores have been set', () => {
    expect(totalScore(null)).toBeNull()
  })

  it('sums all six dimensions', () => {
    const scores = { people: 3, time: 3, money: 5, quality: 1, service: 1, price: 5 }
    expect(totalScore(scores)).toBe(18)
  })

  it('defaults every dimension to the same neutral value', () => {
    const scores = emptyScoreSet()
    expect(Object.values(scores).every((value) => value === scores.people)).toBe(true)
  })
})
