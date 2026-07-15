'use client';

import { useEffect, useState, useRef } from 'react';

type ConnectionStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface ConnectionState {
  status: ConnectionStatus;
  phone?: string;
  qrPng?: string;
  updatedAt?: number;
  _debug?: {
    hasToken: boolean;
    hasPhoneId: boolean;
    hasVerifyToken: boolean;
    hasBotPhone: boolean;
    hasGeminiKey: boolean;
  };
}

function getAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tg_admin_key') || '';
}

function setAdminKey(key: string) {
  localStorage.setItem('tg_admin_key', key);
}

function clearAdminKey() {
  localStorage.removeItem('tg_admin_key');
}

export default function Dashboard() {
  const [adminKey, setAdminKeyState] = useState(getAdminKey());
  const [showLogin, setShowLogin] = useState(!getAdminKey());
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' });
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [humanMessage, setHumanMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const simulateInputRef = useRef<HTMLInputElement>(null);

  function apiFetch(url: string, options?: RequestInit) {
    const headers: Record<string, string> = {
      'x-api-key': adminKey,
      ...(options?.headers as Record<string, string> || {}),
    };
    return fetch(url, { ...options, headers });
  }

  useEffect(() => {
    if (!adminKey) return;
    fetchStatus();
    fetchConversations();
    const POLL_MS = 8000;
    let interval: ReturnType<typeof setInterval>;
    function start() {
      interval = setInterval(() => {
        fetchStatus();
        fetchConversations();
        if (selectedConv) fetchMessages(selectedConv.id);
      }, POLL_MS);
    }
    function stop() { clearInterval(interval); }
    start();
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [adminKey, selectedConv]);

  async function fetchStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await apiFetch('/api/bot/connection/status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setConnection(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function fetchConversations() {
    try {
      const res = await apiFetch('/api/bot/conversations');
      if (res.status === 401) {
        clearAdminKey();
        setAdminKeyState('');
        setShowLogin(true);
        return;
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }

  async function fetchMessages(convId: number) {
    try {
      const res = await apiFetch(`/api/bot/messages/${convId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }

  function selectConversation(conv: any) {
    setSelectedConv(conv);
    fetchMessages(conv.id);
    setShowSidebar(false);
  }

  async function sendHumanMessage() {
    if (!humanMessage.trim() || !selectedConv) return;
    await apiFetch(`/api/bot/messages/${selectedConv.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'human', content: humanMessage }),
    });
    setHumanMessage('');
    fetchMessages(selectedConv.id);
  }

  async function simulateClientMessage(text: string) {
    if (!text.trim() || !selectedConv) return;
    await apiFetch('/api/bot/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: selectedConv.phone, text }),
    });
    setTimeout(() => fetchMessages(selectedConv.id), 3000);
  }

  async function takeConversation(convId: number) {
    await apiFetch(`/api/bot/conversations/${convId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'take' }),
    });
    fetchConversations();
  }

  async function releaseConversation(convId: number) {
    await apiFetch(`/api/bot/conversations/${convId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release' }),
    });
    fetchConversations();
  }

  function handleLogin() {
    if (!loginInput.trim()) {
      setLoginError('Ingresá la API key');
      return;
    }
    setAdminKey(loginInput.trim());
    setAdminKeyState(loginInput.trim());
    setShowLogin(false);
    setLoginError('');
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

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">TaxiGuazú Bot</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresá la clave de administrador</p>
          </div>
          <input
            type="password"
            value={loginInput}
            onChange={(e) => { setLoginInput(e.target.value); setLoginError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="API Key"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
          />
          {loginError && <p className="text-red-500 text-xs mb-3">{loginError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Ingresar
          </button>
        </div>
      </div>
    );
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center max-w-md p-8">{/* same content */}
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">TaxiGuazú Bot</h1>
          
          {connection.status === 'connecting' && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600">Conectando...</span>
              </div>
            </div>
          )}
          
          {(connection.status === 'disconnected' || connection.status === 'connecting') && !connection.qrPng && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-gray-600 mb-4">El bot está iniciando. Esperá un momento...</p>
              <div className="text-sm text-gray-500">Si el problema persiste, verificá las credenciales.</div>
            </div>
          )}

          {connection.qrPng && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-amber-600 font-medium mb-4 flex items-center gap-2 justify-center">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Escaneá el QR con WhatsApp
              </p>
              <div className="bg-white p-4 rounded-lg inline-block shadow-inner">
                <img src={connection.qrPng} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-500 mt-4">El código se actualiza automáticamente</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm md:text-base">TaxiGuazú Bot</h1>
              <p className="text-xs text-gray-500">{connection.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-xs text-gray-500 hidden sm:inline">Conectado</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {showSidebar && (
          <div className="fixed inset-0 bg-black/30 z-10 md:hidden" onClick={() => setShowSidebar(false)} />
        )}
        <aside className={`${showSidebar ? 'block' : 'hidden'} md:block absolute md:relative z-20 md:z-0 w-72 md:w-80 bg-white border-r border-gray-200 overflow-y-auto h-full`}>
          <div className="p-3 md:p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Conversaciones</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No hay conversaciones activas</div>
            )}
            {conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full p-3 md:p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedConv?.id === conv.id ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-800 text-sm truncate max-w-[160px]">{conv.phone}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{timeAgo(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    conv.taken_by_human ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {conv.taken_by_human ? 'HUMAN' : 'AI'}
                  </span>

                </div>
                {conv.last_message_preview && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{conv.last_message_preview}</p>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{selectedConv.phone}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedConv.taken_by_human ? 'Atendido por humano' : 'Atendido por IA'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selectedConv.taken_by_human ? (
                    <button onClick={() => releaseConversation(selectedConv.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                      Devolver al bot
                    </button>
                  ) : (
                    <button onClick={() => takeConversation(selectedConv.id)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                      Tomar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-gray-200 text-gray-800'
                        : msg.role === 'assistant'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-500' : 'text-white/70'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedConv.taken_by_human && (
                <div className="p-3 md:p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={humanMessage}
                      onChange={(e) => setHumanMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendHumanMessage()}
                      placeholder="Escribí un mensaje..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={sendHumanMessage} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0">
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {!selectedConv.taken_by_human && (
                <div className="p-3 md:p-4 bg-gray-100 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-2 text-center">El bot responde automáticamente</p>
                  <div className="flex gap-2">
                    <input
                      ref={simulateInputRef}
                      type="text"
                      placeholder="Simular respuesta del cliente..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && simulateInputRef.current?.value.trim()) {
                          simulateClientMessage(simulateInputRef.current.value);
                          simulateInputRef.current.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (simulateInputRef.current?.value.trim()) {
                          simulateClientMessage(simulateInputRef.current.value);
                          simulateInputRef.current.value = '';
                        }
                      }}
                      className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 shrink-0"
                    >
                      Simular
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm md:text-base">Seleccioná una conversación</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
