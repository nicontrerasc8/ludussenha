"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = {
  type: "idle" | "success" | "error";
  message: string;
};

let supabaseClient: SupabaseClient | null = null;
const passwordRecoveryRedirectUrl = "https://ludussenha.vercel.app/";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  supabaseClient ??= createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>({
    type: "idle",
    message: "",
  });

  const supabase = useMemo(() => getSupabase(), []);
  const visibleStatus: Status =
    status.message || supabase
      ? status
      : {
          type: "error",
          message:
            "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function sendRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setStatus({ type: "idle", message: "" });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordRecoveryRedirectUrl,
    });

    setIsLoading(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }

    setStatus({
      type: "success",
      message: "Revisa tu correo para continuar con la recuperación.",
    });
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setStatus({ type: "idle", message: "" });

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }

    setPassword("");
    setStatus({
      type: "success",
      message: "Tu contraseña fue actualizada.",
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f6f5f2] px-6 py-10 text-[#171717]">
      <section className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-[#6f6a60]">
            Ludus
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Ludus recuperar contraseña
          </h1>
        </div>

        <div className="rounded-lg border border-[#ded9cf] bg-white p-6 shadow-sm">
          {hasRecoverySession ? (
            <form className="space-y-5" onSubmit={updatePassword}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Nueva contraseña
                </span>
                <input
                  className="h-11 w-full rounded-md border border-[#cfc8bd] px-3 outline-none transition focus:border-[#2f6f68] focus:ring-2 focus:ring-[#2f6f68]/20"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Escribe tu nueva contraseña"
                  required
                  type="password"
                  value={password}
                />
              </label>

              <button
                className="h-11 w-full rounded-md bg-[#2f6f68] px-4 text-sm font-semibold text-white transition hover:bg-[#285f59] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={sendRecoveryEmail}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Correo</span>
                <input
                  className="h-11 w-full rounded-md border border-[#cfc8bd] px-3 outline-none transition focus:border-[#2f6f68] focus:ring-2 focus:ring-[#2f6f68]/20"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <button
                className="h-11 w-full rounded-md bg-[#2f6f68] px-4 text-sm font-semibold text-white transition hover:bg-[#285f59] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          )}

          {visibleStatus.message ? (
            <p
              className={`mt-5 rounded-md px-3 py-2 text-sm ${
                visibleStatus.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {visibleStatus.message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
