export default function RootLoading() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="min-h-[60dvh] w-full max-w-content mx-auto px-4 md:px-8 py-12 flex flex-col gap-6"
        >
            <span className="sr-only">Cargando contenido…</span>
            <div className="h-10 w-64 rounded-2xl bg-default-200/70 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-64 rounded-3xl bg-default-200/60 animate-pulse" />
                <div className="h-64 rounded-3xl bg-default-200/60 animate-pulse" />
                <div className="h-64 rounded-3xl bg-default-200/60 animate-pulse" />
            </div>
        </div>
    );
}
