import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";

interface WalletContextType {
  status: "disconnected" | "connecting" | "connected";
  publicKey: string | null;
  address: string | null; // <-- 1. Añadido para que TypeScript reconozca el alias
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verificar si la wallet ya está conectada al cargar la app
  const checkWalletConnection = useCallback(async () => {
    try {
      const connection = await isConnected();
      const connected = typeof connection === "boolean" ? connection : connection?.isConnected;

      if (connected) {
        const addressResult = await getAddress();
        const address = typeof addressResult === "string" ? addressResult : addressResult?.address;
        if (address) {
          setPublicKey(address);
          setStatus("connected");
        }
      }
    } catch (err) {
      console.error("Error al verificar conexión con Freighter:", err);
    }
  }, []);

  useEffect(() => {
    void checkWalletConnection();
  }, [checkWalletConnection]);

  // Solicitud de conexión al pulsar el botón
  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      // Solicitar acceso a la extensión
      const access = await requestAccess();

      if (access?.error) {
        throw new Error(access.error);
      }

      // Obtener dirección pública tras dar permisos
      const addressResult = access?.address ? access : await getAddress();
      const address = typeof addressResult === "string" ? addressResult : addressResult?.address;

      if (address) {
        setPublicKey(address);
        setStatus("connected");
      } else {
        throw new Error("No se pudo obtener la dirección pública de Freighter.");
      }
    } catch (err: any) {
      console.error("Error al conectar wallet:", err);
      setError(err?.message || "No se pudo conectar con la wallet Freighter.");
      setStatus("disconnected");
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      publicKey,
      address: publicKey, // Alias para compatibilidad global
      error,
      connect,
      disconnect,
    }),
    [status, publicKey, error, connect, disconnect] // <-- 2. Dependencias corregidas
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet debe usarse dentro de un WalletProvider");
  }
  return context;
}