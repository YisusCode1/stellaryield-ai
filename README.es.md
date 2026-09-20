# StellarYield AI
> 🌐 **English:** You can read this document in English in [README.md](README.md).

Experiencia DeFi asistida por Inteligencia Artificial construida sobre Stellar.

## Concepto

StellarYield AI es una dApp nativa de Stellar que analiza los mercados de préstamos (*lending*) y proporciona recomendaciones de estrategia explicables y transparentes para los usuarios.

La IA no controla los fondos del usuario.

* **La IA recomienda.**
* **El usuario decide.**
* **La billetera firma.**
* **Stellar ejecuta.**

El Asesor de IA (*AI Advisor*) funciona únicamente como una capa informativa. Consume datos de mercado en tiempo real y el perfil de riesgo seleccionado por el usuario para generar una recomendación determinista. Nunca accede a claves privadas, ni solicita firmas directas, ni construye transacciones sin custodia, ni mantiene la custodia de los fondos.

---

## Arquitectura e Integración On-Chain

* **Stellar Testnet & Smart Contracts en Soroban**: Contrato de custodia y vault (`stellaryield-vault`) desplegado on-chain para registrar las recomendaciones de estrategia y gestionar retiros aplicando una comisión automatizada del 0.25%.
* **API del Asesor de IA**: Servicio de backend determinista que evalúa instantáneas del mercado frente a perfiles de riesgo (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`).
* **Frontend**: Aplicación en React + TypeScript integrada con billeteras Web3 (Freighter / Albedo).

### Información del Contrato On-Chain (Testnet)
* **Nombre del Contrato**: `stellaryield-vault`
* **ID del Contrato**: `CDXZ3ILDQHOLJKLSXH6F4CJ7YWXUFIUE7FBKFC3AEO6B4C3FMXQXWZOP`
* **Red**: Stellar Testnet (`https://soroban-testnet.stellar.org:443`)
* **Frase de Red**: `"Test SDF Network ; September 2015"`

---

## Stack Tecnológico

- **Blockchain**: Stellar Testnet, Soroban (Rust SDK)
- **Backend / API**: Node.js, TypeScript, Express (`apps/api`)
- **Frontend**: React, TypeScript, Vite (`apps/web`)
- **Integraciones**: XOXNO Markets, `@stellar/stellar-sdk`
- **Infraestructura**: Docker, Docker Compose, npm Workspaces

---

## Inicio Rápido (Desarrollo Local)

### 1. Clonar e Instalar Dependencias
```bash
git clone [https://github.com/tu-usuario/stellaryield-ai.git](https://github.com/tu-usuario/stellaryield-ai.git)
cd stellaryield-ai
npm install
