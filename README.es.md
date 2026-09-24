# StellarYield AI

> English: see [README.md](README.md).

StellarYield AI es una demo no custodial para Stellar Testnet. Permite consultar
mercados de lending de XOXNO, recibir una recomendación explicable y firmar
operaciones reales de Supply y Withdraw con Freighter.

## Garantía de datos reales

Esta versión no incluye modo mock ni transacciones simuladas en la interfaz.

- El backend sólo acepta `STELLAR_NETWORK=testnet`; Mainnet se rechaza al iniciar.
- Mercados, tasas, liquidez, posiciones y actividad se consultan en XOXNO.
- Si XOXNO devuelve datos incompletos, la aplicación muestra un error y no crea
  una transacción con valores de reemplazo.
- El hash mostrado al finalizar procede de la RPC de Stellar Testnet y sólo se
  muestra tras obtener el estado `SUCCESS`.
- La simulación Soroban previa a la firma es una validación real de Testnet;
  no sustituye el envío de la transacción ni modifica fondos.

## Flujo de demo

`Freighter (Testnet) → XOXNO Testnet → Supply → posición → Withdraw`

- Los mercados, posiciones y actividad proceden de la API de lending de XOXNO.
- El frontend usa el despliegue oficial `stellarTestnet` del SDK de XOXNO y
  prepara un XDR Soroban sin firmar antes de pedir la aprobación de la wallet.
- El navegador nunca recibe, guarda ni transmite claves privadas o frases semilla.
- El AI Advisor solo analiza mercados; no firma, no envía transacciones y no
  puede retirar fondos.

El contrato `StellarYieldVault` histórico no se usa en la ruta XOXNO. Su
propósito limitado está documentado en
[contracts/soroban/README.md](contracts/soroban/README.md).

## Requisitos

- Node.js 22 o superior.
- Freighter configurado en **Stellar Testnet**.
- XLM de Testnet para reserva de cuenta y comisiones.
- Un activo de Testnet habilitado actualmente por XOXNO. La aplicación obtiene
  el activo, hub y spoke desde XOXNO; no usa un contrato de token fijo.

Los tokens de Testnet solo sirven para demostración. El APY es variable y no
garantiza rendimiento.

## Ejecutar localmente

```powershell
npm install
Copy-Item .env.example .env
npm run dev:api
npm run dev:web
```

Abre la URL de Vite y conecta Freighter en **Stellar Testnet**. El frontend no
tiene modo mock y la API debe estar disponible en `VITE_API_URL`
(por defecto `http://localhost:3000`).

En desarrollo, la API permite de forma explícita los orígenes locales
`http://localhost:5173` y `http://127.0.0.1:5173`. En producción debes definir
`ALLOWED_ORIGINS` con el dominio HTTPS exacto del frontend.

La API debe poder llegar a `https://api.xoxno.com` y el navegador a Horizon y
la RPC de Testnet. No añadas claves privadas, frases semilla ni secretos a
`.env`.

## Preparar una wallet de demo

1. Crea o importa una cuenta de **Testnet** en Freighter.
2. Fondea la cuenta con XLM Testnet mediante el [faucet oficial de Stellar](https://developers.stellar.org/docs/learn/fundamentals/networks#testnet).
3. Obtén un activo de Testnet que aparezca como habilitado por XOXNO.
4. Conserva XLM suficiente para la reserva de cuenta y las comisiones.

El proyecto no genera cuentas, no solicita frases semilla y no puede fondear la
wallet por el usuario.

## Lista de verificación Testnet

1. Confirma en Freighter la red `Test SDF Network`.
2. Fondea la wallet con una cantidad pequeña de XLM Testnet y un activo Testnet
   soportado.
3. Verifica que el mercado elegido esté disponible en la interfaz.
4. Haz Supply de un monto mínimo, revisa el XDR en Freighter y firma.
5. Espera el estado `SUCCESS` y abre el enlace del explorador Testnet.
6. Actualiza **Mi Portafolio** y verifica la posición de XOXNO.
7. Usa **Retirar todo** para generar el retiro oficial de XOXNO.

Si un mercado no está disponible, la aplicación bloquea la firma. Si falla la
pre-simulación real de Soroban, no reintentes a ciegas: revisa el error, el
saldo de la wallet y el estado del mercado.

## Alcance verificable de la demo

La verificación completa exige que una persona conecte su propia wallet,
apruebe el XDR en Freighter y compruebe el hash de Testnet en el explorador. El
repositorio no contiene una firma, cuenta o fondos de terceros, por lo que no
declara una transacción enviada si no existe su hash `SUCCESS`.

## Verificaciones de desarrollo

```powershell
npm run typecheck:api
npm run test:api
npm --workspace apps/web run build
```

## Límites de seguridad

- Los builders usan siempre el manifiesto `stellarTestnet` del SDK de XOXNO; la
  UI no acepta una dirección de contrato arbitraria para Supply o Withdraw.
- La API valida direcciones antes de consultar posiciones o actividad.
- La interfaz firma solo XDR preparados después de la simulación Soroban y
  espera una confirmación con límite de tiempo.
- No hay trading automático, custodia, firmas delegadas ni acceso a secretos de
  la wallet.
