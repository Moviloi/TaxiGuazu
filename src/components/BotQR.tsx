'use client';

import { useEffect, useState } from 'react';

type ConnectionStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

export default function BotQR() {
  const [connection, setConnection] = useState<{
    status: ConnectionStatus;
    phone: string | null;
    qrPng: string | null;
    platform?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/connection/status');
      const data = await res.json();
      setConnection(data);
    } catch (err) {
      console.error('Error cargando estado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center p-10">Cargando estado del bot...</p>;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4 text-gray-800">TaxiGuazú Bot</h2>

      {connection?.status === 'connected' ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <p className="text-green-600 font-semibold">Conectado</p>
          </div>
          <p className="text-gray-600 text-sm">
            {connection.platform === 'whatsapp-business-api'
              ? 'WhatsApp Business API'
              : 'Baileys'}
          </p>
          {connection.phone && (
            <p className="text-gray-500 text-xs mt-1">{connection.phone}</p>
          )}
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Actualizar
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-yellow-600 font-semibold">Desconectado</p>
          <p className="text-gray-500 text-sm mt-1">
            Verificá la configuración del webhook en Meta
          </p>
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}