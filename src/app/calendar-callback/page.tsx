"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiFetch } from "@/lib/api";

function CalendarCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refresh } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const code = searchParams?.get("code");
  const errorParam = searchParams?.get("error");

  useEffect(() => {
    // Si Google retorna un error directo (ej. el usuario canceló el proceso)
    if (errorParam) {
      setStatus("error");
      setErrorMessage("La conexión fue cancelada o denegada por Google.");
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No se recibió el código de autorización.");
      return;
    }

    if (!user) {
      setStatus("error");
      setErrorMessage("Debes iniciar sesión para conectar tu calendario.");
      return;
    }

    let isMounted = true;

    const exchangeToken = async () => {
      try {
        await apiFetch(`/calendar-auth/callback?code=${encodeURIComponent(code)}`, { method: "POST" });
        await refresh();
        if (isMounted) {
          setStatus("success");
        }
      } catch (error) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 
            "Hubo un problema al conectar con Google. Por favor intenta nuevamente."
          );
        }
      }
    };

    exchangeToken();

    return () => {
      isMounted = false;
    };
  }, [code, errorParam, user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4">
            <Icon icon="lucide:loader-2" className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-semibold">Conectando tu Calendario...</h2>
            <p className="text-zinc-500 text-sm">
              Por favor, no cierres esta ventana. Estamos enlazando tu cuenta de Google.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center space-y-4">
            <Icon icon="lucide:check-circle-2" className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              ¡Conexión Exitosa!
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Tu Google Calendar ha sido vinculado correctamente. A partir de ahora, 
              todas las agendas que generes se guardarán automáticamente en tu calendario.
            </p>
            <Button 
              onClick={() => { if (user?.role === "contractor") { router.push("/contractor/profile"); } else { router.push("/musician/profile"); } } }
              className="w-full"
            >
              Volver a mi Panel
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4">
            <Icon icon="lucide:x-circle" className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Ocurrió un error
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {errorMessage}
            </p>
            <Button 
              onClick={() => { if (user?.role === "contractor") { router.push("/contractor/profile"); } else { router.push("/musician/profile"); } } }
              variant="bordered"
              className="w-full"
            >
              Volver y reintentar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Icon icon="lucide:loader-2" className="animate-spin w-8 h-8" /></div>}>
      <CalendarCallbackContent />
    </Suspense>
  );
}



