import type { ReactNode } from 'react'
import classes from './ShimmerText.module.css'

interface ShimmerTextProps {
  children: ReactNode
}

export function ShimmerText({ children }: ShimmerTextProps) {
  return <span className={classes.shimmer}>{children}</span>
}
