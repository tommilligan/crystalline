function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  liveblocksSecretKey: required('LIVEBLOCKS_SECRET_KEY'),
  /** Comma-separated list of origins allowed to call this API (the frontend's dev/prod URLs). */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
}
