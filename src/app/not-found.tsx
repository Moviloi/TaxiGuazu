import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-6">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
