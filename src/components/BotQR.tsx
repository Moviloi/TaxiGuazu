'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function BotQR() {
  const [qrImage, setQrImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchQR = async () => {
    try {
      const res = await fetch('/api/bot/qr');
      const data = await res.json();
      
      if (data.qr) {
        // Genera la imagen Base64 a partir del string del QR
        const url = await QRCode.toDataURL(data.qr, {
          width: 300,
          margin: 2,
        });
        setQrImage(url);
      } else {
        setQrImage('');
      }
    } catch (err) {
      console.error('Error cargando QR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
    const interval = setInterval(fetchQR, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center p-10">Cargando estado del bot...</p>;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Escaneá para conectar TaxiGuazú</h2>
      
      {qrImage ? (
        <div className="bg-white p-4 rounded-lg shadow-inner">
          <img src={qrImage} alt="WhatsApp QR Code" />
          <p className="text-sm text-gray-500 mt-2 text-center">El código se actualiza automáticamente</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-green-600 font-semibold">¡Bot conectado o esperando nuevo código!</p>
          <button 
            onClick={fetchQR}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar ahora
          </button>
        </div>
      )}
    </div>
  );
}