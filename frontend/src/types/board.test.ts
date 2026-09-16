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

  it('starts with no dimensions scored', () => {
    expect(emptyScoreSet()).toEqual({})
  })

  it('sums only the dimensions scored so far, ignoring the rest', () => {
    expect(totalScore({ people: 4, money: 2 })).toBe(6)
  })

  it('treats a single scored dimension as not affecting the others', () => {
    const scores = { people: 5 }
    expect(scores.time).toBeUndefined()
    expect(scores.money).toBeUndefined()
  })
})
