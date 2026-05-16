"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="text-red-500 text-5xl mb-4">💥</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error crítico</h1>
            <p className="text-gray-600 mb-6">
              El sistema falló al cargar. {error.digest ? `Código: ${error.digest}` : "Recargá la página."}
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
