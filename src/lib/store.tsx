import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../server/api";

/**
 * En production, la session est portée par un cookie HttpOnly + Secure + SameSite=Lax
 * posé par le serveur : le JavaScript n'y a pas accès. Dans la sandbox, le jeton
 * opaque (aléatoire, 256 bits) est conservé localement et vérifié par l'API simulée.
 */
const TOKEN_KEY = "alw_session";
const DEVICE_KEY = "alw_device";
const PENDING_KEY = "alw_otp";

export function deviceId() {
  let d = localStorage.getItem(DEVICE_KEY);
  if (!d) {
    const a = new Uint8Array(12); crypto.getRandomValues(a);
    d = Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_KEY, d);
  }
  return d;
}
export const pendingOtp = {
  get: (): { requestId: string; maskedEmail: string; expiresAt: number; resendAt: number; email: string; mode?: "login" | "signup" | "reset" } | null => { try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch { return null; } },
  set: (v: unknown) => sessionStorage.setItem(PENDING_KEY, JSON.stringify(v)),
  clear: () => sessionStorage.removeItem(PENDING_KEY),
};

type Me = Awaited<ReturnType<typeof api.me>>;
type Toast = { id: number; text: string; kind: "success" | "error" | "info" };

interface Ctx {
  token: string | null; me: Me | null; ready: boolean;
  login: (t: string) => Promise<void>; logout: () => Promise<void>; refreshMe: () => Promise<void>;
  cartCount: number; refreshCart: () => void;
  unread: number; refreshUnread: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
}
const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const refreshCart = useCallback(() => { api.getCart(deviceId()).then((c) => setCartCount(c.count)).catch(() => {}); }, []);
  const refreshUnread = useCallback(() => { if (token) api.unreadCount(token).then(setUnread).catch(() => {}); }, [token]);

  useEffect(() => {
    let alive = true;
    if (!token) { setMe(null); setReady(true); return; }
    api.me(token).then((m) => { if (alive) { setMe(m); setReady(true); } }).catch(() => { localStorage.removeItem(TOKEN_KEY); if (alive) { setToken(null); setMe(null); setReady(true); } });
    return () => { alive = false; };
  }, [token]);
  useEffect(() => { refreshCart(); }, [refreshCart]);
  useEffect(() => { refreshUnread(); const i = setInterval(refreshUnread, 8000); return () => clearInterval(i); }, [refreshUnread]);

  const login = useCallback(async (t: string) => { localStorage.setItem(TOKEN_KEY, t); setReady(false); setToken(t); }, []);
  const logout = useCallback(async () => { if (token) await api.logout(token); localStorage.removeItem(TOKEN_KEY); setToken(null); setMe(null); }, [token]);

  const refreshMe = useCallback(async () => { if (token) { try { setMe(await api.me(token)); } catch { /* session expirée */ } } }, [token]);
  const value = useMemo(() => ({ token, me, ready, login, logout, refreshMe, cartCount, refreshCart, unread, refreshUnread, toast }), [token, me, ready, login, logout, refreshMe, cartCount, refreshCart, unread, refreshUnread, toast]);
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`toast-in pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl ${t.kind === "error" ? "bg-rose-600/95 text-white" : t.kind === "info" ? "bg-slate-900/90 text-white" : "bg-emerald-600/95 text-white"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
export function useApp() { const c = useContext(AppCtx); if (!c) throw new Error("AppProvider manquant"); return c; }

/** Petit hook de chargement de données */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true; setLoading(true);
    fn().then((d) => { if (alive) { setData(d); setError(null); } }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, error, loading, reload: () => setN((x) => x + 1), setData };
}
