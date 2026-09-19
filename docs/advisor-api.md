# API del AI Advisor

La API es de sólo lectura y recomendación. No admite direcciones de wallet,
firmas, claves, frases semilla ni datos de transacciones. El mercado se obtiene
exclusivamente a través de `MarketProvider`, el puerto de lectura que conectará
la integración XOXNO de Persona 1.

## Ejecutar en modo demo

Instala las dependencias de `apps/api`, copia `.env.example` de la raíz a `.env`
y configura:

```dotenv
STELLAR_NETWORK=testnet
ADVISOR_MARKET_SOURCE=demo
ALLOWED_ORIGINS=http://localhost:5173
API_PORT=3000
```

Luego ejecuta:

```bash
npm run dev:api
```

`demo` es intencionalmente explícito y no debe desplegarse. El valor por defecto
es `xoxno`; hasta que Persona 1 entregue ese adaptador, las rutas de mercados y
recomendación responden `503` en lugar de inventar datos.

En producción, el proceso rechaza iniciar con `demo`, con `ALLOWED_ORIGINS` sin
definir o con un origen que no sea HTTPS.

## Endpoints

### `GET /health`

Respuesta de disponibilidad del proceso:

```json
{ "data": { "status": "ok" } }
```

### `GET /api/v1/markets`

Devuelve el snapshot normalizado del proveedor. Es el mismo snapshot que se usa
al recomendar; no se acepta desde el navegador para evitar que datos manipulados
produzcan una recomendación falsa.

### `POST /api/v1/advisor/recommendations`

Entrada permitida:

```json
{
  "amountUsd": 100,
  "riskProfile": "moderate",
  "preferredAsset": "USDC"
}
```

`preferredAsset` es opcional. Los únicos perfiles válidos son `conservative`,
`moderate` y `aggressive`. Los campos desconocidos, montos no finitos o fuera de
rango y activos inválidos reciben `400`.

La respuesta contiene `recommended` con `action: "supply"`, razones, advertencias
y marca de tiempo, o `not_recommended` sin ninguna acción. El frontend debe
ocultar `Continuar` para el segundo caso.

## Controles de seguridad

- Límite de cuerpo JSON de 8 KB y esquema de allowlist estricto.
- CORS con orígenes explícitos configurables; no se permiten comodines.
- Rate limit de 30 solicitudes por IP/minuto como defensa básica para una única
  instancia. En despliegue horizontal se debe reemplazar por un límite compartido
  en el proxy o Redis.
- Encabezados `CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
  y `Permissions-Policy`; HSTS se activa en producción detrás de HTTPS.
- Errores internos y detalles del proveedor no se devuelven al cliente; cada
  respuesta incluye `X-Request-Id` para diagnosticarla en logs.
- El proceso no inicializa SDKs de wallet ni recibe secretos. Las operaciones
  on-chain siguen perteneciendo al módulo de Persona 1.

## Integración XOXNO

Persona 1 debe implementar `MarketProvider` en
`apps/api/src/providers/market-provider.ts`. Antes de devolver un snapshot, el
adaptador debe convertir datos externos al tipo `Market`, conservar `network` y
una fecha `updatedAt` ISO-8601 de la fuente. El motor rechaza datos de otra red,
con más de cinco minutos de antigüedad, valores no finitos, utilización fuera de
0–100% o liquidez insuficiente.
