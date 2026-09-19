# Persona 3 — IA, Producto y Pitch

## Misión y límite de responsabilidad

Persona 3 convierte los datos de mercado en una recomendación clara y explicable. El Advisor **no** recibe claves, frases semilla, permisos de firma ni instrucciones para enviar transacciones. El flujo termina siempre con una intención de usuario que el frontend entrega al módulo de wallet de Persona 1.

```text
Mercados XOXNO (Persona 1)
        ↓
Normalización de datos
        ↓
AI Advisor (Persona 3) ── recomendación explicable ──→ Frontend (Persona 2)
        ↓                                                        ↓
  perfil + monto                                           usuario decide
                                                                 ↓
                                                       wallet / firma (Persona 1)
```

## Entregable del Día 1: contrato y criterio de recomendación

### Datos que el Advisor necesita

Persona 1 expondrá mercados normalizados, desde el API o directamente en el frontend mientras se trabaja con mocks:

```ts
type Market = {
  asset: string                 // por ejemplo: "USDC"
  supplyApy: number             // porcentaje anual, ej. 6.42
  borrowApy: number             // porcentaje anual, ej. 9.1
  availableLiquidityUsd: number // ej. 250000
  totalSupplyUsd: number
  totalBorrowUsd: number
  utilization: number           // porcentaje 0–100
  network: 'testnet' | 'mainnet'
  updatedAt: string             // ISO-8601
}
```

El proveedor debe distinguir entre `0` y un dato ausente; el Advisor no recomendará un mercado cuyo APY, liquidez o utilización no se haya podido obtener. Los importes son números, no strings formateados ni valores en unidades mínimas.

### Entrada y salida del Advisor

```ts
type AdvisorRequest = {
  amountUsd: number
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  preferredAsset?: string
  markets: Market[]
}

type AdvisorRecommendation = {
  status: 'recommended' | 'not_recommended'
  action?: 'supply'
  asset?: string
  amountUsd?: number
  currentSupplyApy?: number
  risk: 'Bajo' | 'Moderado' | 'Alto'
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
  cautions: string[]
  generatedAt: string
  disclaimer: string
}
```

### Perfiles y reglas v1

| Perfil | Utilización aceptada | Liquidez mínima | Lectura de riesgo |
| --- | ---: | ---: | --- |
| Conservador | 0–70% | 5× el monto | Bajo |
| Moderado | 0–85% | 3× el monto | Moderado |
| Agresivo | 0–92% | 2× el monto | Alto |

Reglas, en orden:

1. Validar que el monto sea positivo y que haya mercados completos.
2. Si el usuario eligió un activo, limitar la evaluación a ese activo.
3. Excluir mercados sin liquidez suficiente o fuera del límite de utilización del perfil.
4. Ordenar los candidatos por APY de supply; en empate, priorizar mayor liquidez y menor utilización.
5. Entregar una única opción para la demo, con dos motivos basados en cifras y al menos una advertencia.
6. Si ningún mercado pasa las reglas, devolver `not_recommended`; nunca forzar una operación por tener un APY alto.

Esta primera versión es deliberadamente determinista: facilita pruebas y demuestra transparencia. Una capa LLM posterior sólo transforma el resultado estructurado en lenguaje natural; no altera las reglas, ni invoca la wallet, ni crea transacciones.

## Entregable del Día 2: integración IA + mercados

- Recibir `Market[]` reales de Persona 1; mientras tanto, usar el mismo contrato con mocks versionados.
- Implementar el evaluador y una ruta `POST /advisor/recommendation` o una función compartida con el contrato anterior.
- Mostrar en UI: activo, monto, Supply APY, nivel de riesgo, razones, advertencia y hora de actualización.
- Incluir estados explícitos: cargando, datos desactualizados, sin recomendación y error de proveedor.
- Probar al menos tres escenarios: USDC moderado recomendado, conservador sin mercado elegible y monto mayor a liquidez disponible.

### Texto de seguridad obligatorio

> Esto es una recomendación informativa basada en datos de mercado. No es asesoría financiera. StellarYield AI no controla tus fondos: revisa los datos y firma sólo si estás de acuerdo.

## Entregable del Día 3: UX del Advisor

El flujo de interfaz que Persona 2 debe integrar es:

1. El usuario indica monto, perfil y opcionalmente activo.
2. El Advisor analiza mercados y enseña una tarjeta de recomendación.
3. La tarjeta explica **por qué** con APY, liquidez y utilización concretos.
4. `Continuar` sólo prellena el modal Supply; no prepara, firma ni envía una transacción.
5. El usuario revisa los valores en el modal y luego Persona 1 solicita la firma desde la wallet.

Estados de copy para la demo:

| Estado | Mensaje |
| --- | --- |
| Recomendación | “Supply USDC · APY actual 6.42% · Riesgo moderado” |
| Sin opción | “No encontramos un mercado que cumpla tus límites de riesgo y liquidez. No recomendamos operar ahora.” |
| Datos no disponibles | “Aún no podemos verificar los datos de mercado. Inténtalo de nuevo antes de decidir.” |
| Datos antiguos | “Los datos tienen más de 5 minutos. Actualízalos antes de continuar.” |

## Día 4: producto y documentación

- Actualizar README con propuesta de valor, instalación, variables de entorno, arquitectura y límites del Advisor.
- Registrar una captura o hash de la transacción de Testnet que aporte Persona 1; enlazarla al explorer en la demo.
- Preparar una arquitectura de una página y una lista de contingencias: wallet no disponible, API de XOXNO caída y operación rechazada.
- Verificar que el portafolio muestre una operación sólo después de confirmación on-chain o un estado de pendiente inequívoco.

## Día 5: historia de demo y criterios de salida

### Historia de 90 segundos

1. “El usuario tiene USDC pero no sabe qué mercado ofrece un rendimiento razonable para su riesgo.”
2. Conectamos una wallet de Testnet y mostramos el balance.
3. Abrimos Mercados: los datos de XOXNO muestran APY, liquidez y utilización.
4. Elegimos `100 USDC` y perfil `moderado` en AI Advisor.
5. El Advisor recomienda Supply USDC y explica las métricas que respaldan esa decisión.
6. Pulsamos Continuar: el monto pasa al modal, pero la IA ya no interviene.
7. El usuario revisa y firma en la wallet.
8. Mostramos la confirmación, la nueva posición y la transacción en Stellar Testnet.

### Definition of done de Persona 3

- [ ] El Advisor recibe datos de mercado con el contrato acordado.
- [ ] Una recomendación usa cifras reales y explica tanto motivos como riesgo.
- [ ] El caso no elegible se comporta de forma segura y no ofrece `Continuar`.
- [ ] No existen claves, permisos de wallet ni construcción de transacciones en el módulo de IA.
- [ ] README, arquitectura y guion de demo están actualizados.
- [ ] La demo completa puede ejecutarse con datos reales de Testnet o con un modo demo claramente identificado.

## Acuerdos de integración con el equipo

| De | A | Entrega | Fecha objetivo |
| --- | --- | --- | --- |
| Persona 1 | Persona 3 | `Market[]` normalizado, red y fecha de actualización | Día 1–2 |
| Persona 3 | Persona 2 | `AdvisorRequest`, `AdvisorRecommendation`, copy y estados | Día 1 |
| Persona 2 | Persona 1 | intención de Supply aprobada por el usuario | Día 3 |
| Persona 1 | Persona 3 | hash/URL de transacción confirmada para el relato de demo | Día 4 |

No se añaden funciones nuevas en los dos últimos días. El criterio de prioridad es siempre: **conectar → analizar → recomendar → firmar → ejecutar**.
