# StellarYield AI
> 🌐 **English:** You can read this document in English in [README.md](README.md).

Experiencia DeFi asistida por Inteligencia Artificial construida sobre Stellar Soroban.

## Concepto

StellarYield AI es una dApp nativa de Stellar que analiza los mercados de préstamos (*lending*) y proporciona recomendaciones de estrategia explicables y transparentes para los usuarios.

La IA no controla los fondos del usuario.

* **La IA recomienda.**
* **El usuario decide.**
* **La billetera firma.**
* **Stellar ejecuta.**

El Asesor de IA (*AI Advisor*) funciona únicamente como una capa informativa. Consume datos de mercado en tiempo real y el perfil de riesgo seleccionado por el usuario para generar recomendaciones deterministas. Nunca accede a claves privadas, ni solicita firmas directas, ni construye transacciones en crudo, ni mantiene la custodia de los fondos.

---

## Arquitectura e Integración On-Chain

* **Stellar Testnet & Smart Contracts en Soroban**: Contrato Vault personalizado (`StellarYieldVault`) integrado con Stellar Asset Contracts (SAC) personalizados para gestionar depósitos y depósitos multitoken de forma automatizada.
* **API del Asesor de IA**: Servicio de backend determinista que evalúa instantáneas del mercado frente a perfiles de riesgo (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`).
* **Frontend**: Aplicación en React + TypeScript integrada con billeteras Web3 (Freighter) y deserialización fluida de transacciones XDR.

### Información de Contratos Desplegados (Testnet)

* **ID del Contrato Vault**: `CAITX5744T6YP2Q6OSDXNRBKLYIL3SWE3XW53FBD2P54CAJODLI6OIMN`
* **ID del Contrato Token USDC (SAC)**: `CCQRAIMWN62JBVUCKCUJFZHDKXMSBHDP7KHFOXI3HETCTJUVIXW5SX7P`
* **Cuenta Emisora (alice)**: `GCGZQK65HHN2KCDWGWEE4O73K7JAOSRQP6LAIONCDLTDS7LWFQWEQM33`
* **Red**: Stellar Testnet (`https://soroban-testnet.stellar.org:443`)
* **Frase de Red**: `Test SDF Network ; September 2015`

---

## Stack Tecnológico

- **Blockchain**: Stellar Testnet, Soroban Rust SDK (`soroban-sdk`)
- **Backend / API**: Node.js, TypeScript, Express (`apps/api`)
- **Frontend**: React, TypeScript, Vite (`apps/web`)
- **Billetera / SDK**: `@stellar/stellar-sdk`, `@stellar/freighter-api`
- **Infraestructura**: Monorepo con npm Workspaces, Docker Compose

---

## Inicio Rápido (Desarrollo Local)

### 1. Clonar e Instalar Dependencias
```bash
git clone [https://github.com/tu-usuario/stellaryield-ai.git](https://github.com/tu-usuario/stellaryield-ai.git)
cd stellaryield-ai
npm install