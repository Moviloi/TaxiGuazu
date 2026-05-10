'use client';

import { useEffect, useState } from 'react';

type ConnectionStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface ConnectionState {
  status: ConnectionStatus;
  phone?: string;
  qrPng?: string;
  updatedAt?: number;
}

export default function Dashboard() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' });
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [humanMessage, setHumanMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchConversations();
    const interval = setInterval(() => {
      fetchStatus();
      fetchConversations();
      if (selectedConv) fetchMessages(selectedConv.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv]);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/bot/connection/status');
      const data = await res.json();
      setConnection(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function fetchConversations() {
    try {
      const res = await fetch('/api/bot/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }

  async function fetchMessages(convId: number) {
    try {
      const res = await fetch(`/api/bot/messages/${convId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }

  async function sendHumanMessage() {
    if (!humanMessage.trim() || !selectedConv) return;
    await fetch(`/api/bot/messages/${selectedConv.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'human', content: humanMessage }),
    });
    setHumanMessage('');
    fetchMessages(selectedConv.id);
  }

  async function takeConversation(convId: number) {
    await fetch(`/api/bot/conversations/${convId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'take' }),
    });
    fetchConversations();
  }

  async function releaseConversation(convId: number) {
    await fetch(`/api/bot/conversations/${convId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release' }),
    });
    fetchConversations();
  }

  function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(timestamp: number) {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'ahora';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
    return `hace ${Math.floor(seconds / 86400)} días`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Conectando...</p>
        </div>
      </div>
    );
  }

  if (connection.status === 'disconnected' || connection.status === 'qr' || connection.status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">TaxiGuazú Bot</h1>
          
          {connection.status === 'connecting' && (
            <div className="card">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600">Conectando...</span>
              </div>
            </div>
          )}
          
          {(connection.status === 'disconnected' || connection.status === 'connecting') && !connection.qrPng && (
            <div className="card">
              <p className="text-gray-600 mb-4">
                El bot está iniciando. Esperá un momento...
              </p>
              <div className="text-sm text-gray-500">
                Si el problema persiste, reiniciá el proceso del bot.
              </div>
            </div>
          )}

          {connection.qrPng && (
            <div className="card">
              <p className="text-amber-600 font-medium mb-4 flex items-center gap-2 justify-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Escaneá el QR con WhatsApp
              </p>
              <div className="bg-white p-4 rounded-lg inline-block shadow-inner">
                <img src={connection.qrPng} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-500 mt-4">
                El código se actualiza automáticamente
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-800">TaxiGuazú Bot</h1>
              <p className="text-sm text-gray-500">{connection.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-sm text-emerald-600 font-medium">Conectado</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Conversaciones</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No hay conversaciones activas
              </div>
            )}
            {conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConv(conv);
                  fetchMessages(conv.id);
                }}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedConv?.id === conv.id ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-800">{conv.phone}</span>
                  <span className="text-xs text-gray-400">{timeAgo(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={conv.taken_by_human ? 'badge-human' : 'badge-ai'}>
                    {conv.taken_by_human ? 'HUMAN' : 'AI'}
                  </span>
                  {conv.trip_status && (
                    <span className="text-xs text-gray-500">{conv.trip_status}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50">
          {selectedConv ? (
            <>
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedConv.phone}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedConv.taken_by_human 
                      ? 'Atendido por humano' 
                      : 'Atendido por IA'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedConv.taken_by_human ? (
                    <button
                      onClick={() => releaseConversation(selectedConv.id)}
                      className="btn-primary text-sm"
                    >
                      Devolver al bot
                    </button>
                  ) : (
                    <button
                      onClick={() => takeConversation(selectedConv.id)}
                      className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
                    >
                      Tomar conversación
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={msg.role === 'user' ? 'flex justify-start' : 'flex justify-end'}
                  >
                    <div
                      className={
                        msg.role === 'user'
                          ? 'message-bubble-user'
                          : msg.role === 'assistant'
                          ? 'message-bubble-bot'
                          : 'message-bubble-human'
                      }
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedConv.taken_by_human && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={humanMessage}
                      onChange={(e) => setHumanMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendHumanMessage()}
                      placeholder="Escribí un mensaje para el cliente..."
                      className="input-field"
                    />
                    <button onClick={sendHumanMessage} className="btn-primary">
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {!selectedConv.taken_by_human && (
                <div className="p-4 bg-gray-100 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    El bot responde automáticamente
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Seleccioná una conversación para ver los mensajes</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
