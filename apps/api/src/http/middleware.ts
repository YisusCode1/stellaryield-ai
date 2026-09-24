import { randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../domain/errors.js'

interface RateLimitEntry {
  count: number
  resetAt: number
}

export const requestContext = (_req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID()
  res.setHeader('X-Request-Id', requestId)
  res.locals.requestId = requestId
  next()
}

export const securityHeaders = (isProduction: boolean) => (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), microphone=()')
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

export const strictCors = (allowedOrigins: readonly string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin')
    if (origin === undefined) {
      next()
      return
    }

    if (!allowedOrigins.includes(origin)) {
      next(new AppError({ message: 'Origen no permitido.', statusCode: 403, code: 'ORIGIN_NOT_ALLOWED' }))
      return
    }

    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id')
    res.setHeader('Access-Control-Max-Age', '600')

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    next()
  }

export const createRateLimiter = (options: { maxRequests: number; windowMs: number }) => {
  const entries = new Map<string, RateLimitEntry>()
  const maxEntries = 10_000

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const previous = entries.get(key)

    // Prevent an attacker from retaining an unbounded number of distinct IP
    // entries. Expired entries are reclaimed first; if the map is still full,
    // fail closed instead of allocating another entry.
    if (previous === undefined && entries.size >= maxEntries) {
      for (const [entryKey, value] of entries) {
        if (now >= value.resetAt) entries.delete(entryKey)
      }
      if (entries.size >= maxEntries) {
        next(new AppError({ message: 'Demasiadas solicitudes. Inténtalo más tarde.', statusCode: 429, code: 'RATE_LIMITED' }))
        return
      }
    }

    const entry = previous === undefined || now >= previous.resetAt
      ? { count: 0, resetAt: now + options.windowMs }
      : previous

    entry.count += 1
    entries.set(key, entry)

    if (entry.count > options.maxRequests) {
      next(new AppError({ message: 'Demasiadas solicitudes. Inténtalo más tarde.', statusCode: 429, code: 'RATE_LIMITED' }))
      return
    }
    next()
  }
}

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError({ message: `Ruta no encontrada: ${req.method} ${req.path}`, statusCode: 404, code: 'NOT_FOUND' }))
}

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const requestId = String(res.locals.requestId ?? '')
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo JSON no es válido.', requestId } })
    return
  }

  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud es demasiado grande.', requestId } })
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.expose ? error.message : 'Error interno del servidor.',
        requestId,
      },
    })
    return
  }

  console.error('Unhandled API error', { requestId, error })
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.', requestId },
  })
}
