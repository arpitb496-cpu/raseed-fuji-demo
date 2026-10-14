"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";

export interface MerchantUser {
  id: string;
  walletAddress: string;
  displayName: string;
  businessName?: string;
  defaultCurrencyDisplay?: string;
}

export function useAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [merchant, setMerchant] = useState<MerchantUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh session helper
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();

      if (data.authenticated && data.merchant) {
        if (address && data.address && address.toLowerCase() !== data.address.toLowerCase()) {
          setIsAuthenticated(false);
          setMerchant(null);
        } else {
          setIsAuthenticated(true);
          setMerchant(data.merchant);
        }
      } else {
        setIsAuthenticated(false);
        setMerchant(null);
      }
    } catch (err) {
      console.error("Session check error:", err);
      setIsAuthenticated(false);
      setMerchant(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (cancelled) return;

        if (data.authenticated && data.merchant) {
          if (address && data.address && address.toLowerCase() !== data.address.toLowerCase()) {
            setIsAuthenticated(false);
            setMerchant(null);
          } else {
            setIsAuthenticated(true);
            setMerchant(data.merchant);
          }
        } else {
          setIsAuthenticated(false);
          setMerchant(null);
        }
      } catch (err) {
        console.error("Session check error:", err);
        if (!cancelled) {
          setIsAuthenticated(false);
          setMerchant(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const signIn = async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      setIsSigning(true);
      setError(null);

      // 1. Get one-time nonce from server
      const nonceRes = await fetch("/api/auth/nonce");
      if (!nonceRes.ok) throw new Error("Failed to obtain authentication nonce.");
      const { nonce } = await nonceRes.json();

      // 2. Prepare SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;

      const siweMessage = new SiweMessage({
        domain,
        address,
        statement: "Sign in with Ethereum to access your CryptoDao merchant dashboard. No funds will be moved.",
        uri: origin,
        version: "1",
        chainId: chainId || 43113,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageToSign = siweMessage.prepareMessage();

      // 3. Prompt wallet signature
      const signature = await signMessageAsync({ message: messageToSign });

      // 4. Verify on server
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSign, signature }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || "Verification failed.");
      }

      const verifyData = await verifyRes.json();
      setMerchant(verifyData.merchant);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      console.error("Sign-in error:", err);
      setError(msg);
    } finally {
      setIsSigning(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setMerchant(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return {
    merchant,
    isAuthenticated,
    isLoading,
    isSigning,
    error,
    signIn,
    logout,
    checkSession,
  };
}
