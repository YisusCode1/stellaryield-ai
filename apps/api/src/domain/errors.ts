export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly expose: boolean

  constructor(options: {
    message: string
    statusCode: number
    code: string
    expose?: boolean
  }) {
    super(options.message)
    this.name = 'AppError'
    this.statusCode = options.statusCode
    this.code = options.code
    this.expose = options.expose ?? true
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super({ message, statusCode: 400, code: 'VALIDATION_ERROR' })
    this.name = 'ValidationError'
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'El servicio de mercados no está disponible.') {
    super({
      message,
      statusCode: 503,
      code: 'MARKET_DATA_UNAVAILABLE',
    })
    this.name = 'ServiceUnavailableError'
  }
}
