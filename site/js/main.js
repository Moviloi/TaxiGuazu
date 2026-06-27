/* ================================================================
   MAIN.JS — GuazuTransfer / TaxiGuazú · ES · EN · PT
   ================================================================ */

/* ===== GA4 helper ===== */
function trackWA(source) {
  if (typeof gtag === 'function') gtag('event', 'whatsapp_click', { source });
}

/* ===== HEADER SCROLL ===== */
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ===== MENÚ MOBILE ===== */
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (header && !header.contains(e.target)) {
      nav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
    }
  });
  nav.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
    nav.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);
  }));
}

/* ===== MOSTRAR CAMPO VUELO ===== */
const selServicio = document.getElementById('servicio');
const grupoVuelo  = document.getElementById('grupo-vuelo');
const grupoGrupo  = document.getElementById('grupo-grupo');
if (selServicio) {
  selServicio.addEventListener('change', () => {
    const v = selServicio.value;
    if (grupoVuelo) grupoVuelo.style.display = v === 'aeropuerto' ? 'flex' : 'none';
    if (grupoGrupo) grupoGrupo.style.display = v === 'grupo' ? 'flex' : 'none';
  });
}

/* ===== FORMULARIO → MENSAJE WHATSAPP ===== */
function enviarReserva() {
  const servicio  = document.getElementById('servicio')?.value || '';
  const vuelo     = document.getElementById('vuelo')?.value || '';
  const fecha     = document.getElementById('fecha')?.value || '';
  const hora      = document.getElementById('hora')?.value || '';
  const pasajeros = document.getElementById('pasajeros')?.value || '';
  const notas     = document.getElementById('notas')?.value || '';

  const lang = document.documentElement.lang || 'es';

  const svcMapES = {
    'aeropuerto':   'Traslado Aeropuerto IGR',
    'cataratas-ar': 'Cataratas lado argentino',
    'cataratas-br': 'Cataratas lado brasileño',
    'ciudad-este':  'Tour compras Ciudad del Este',
    'duty-free':    'Duty Free Iguazú',
    'grupo':        'Traslado grupal (requiere cotización)',
    'otro':         'Otro destino'
  };
  const svcMapEN = {
    'aeropuerto':   'Airport transfer IGR',
    'cataratas-ar': 'Iguazu Falls — Argentine side',
    'cataratas-br': 'Iguazu Falls — Brazilian side',
    'ciudad-este':  'Shopping tour Ciudad del Este',
    'duty-free':    'Duty Free Iguazú',
    'grupo':        'Group transfer (quote required)',
    'otro':         'Other destination'
  };
  const svcMapPT = {
    'aeropuerto':   'Transfer Aeroporto IGR',
    'cataratas-ar': 'Cataratas lado argentino',
    'cataratas-br': 'Cataratas lado brasileiro',
    'ciudad-este':  'Tour compras Ciudad del Este',
    'duty-free':    'Duty Free Iguazú',
    'grupo':        'Transfer em grupo (cotização necessária)',
    'outro':        'Outro destino'
  };

  const svcMap = lang === 'en' ? svcMapEN : lang === 'pt' ? svcMapPT : svcMapES;
  const svcLabel = svcMap[servicio] || servicio;

  let fechaFmt = fecha;
  if (fecha) { const [y,m,d] = fecha.split('-'); fechaFmt = `${d}/${m}/${y}`; }

  let msg = '';
  if (lang === 'en') {
    msg = `Hello! I'd like to book a transfer:\n\n`;
    msg += `📍 Service: ${svcLabel}\n`;
    if (vuelo)     msg += `✈️ Flight: ${vuelo}\n`;
    if (fecha)     msg += `📅 Date: ${fechaFmt}\n`;
    if (hora)      msg += `🕐 Time: ${hora}\n`;
    if (pasajeros) msg += `👥 Passengers: ${pasajeros}\n`;
    if (notas)     msg += `📝 Notes: ${notas}\n`;
    msg += `\nIs this available?`;
  } else if (lang === 'pt') {
    msg = `Olá! Gostaria de reservar um transfer:\n\n`;
    msg += `📍 Serviço: ${svcLabel}\n`;
    if (vuelo)     msg += `✈️ Voo: ${vuelo}\n`;
    if (fecha)     msg += `📅 Data: ${fechaFmt}\n`;
    if (hora)      msg += `🕐 Hora: ${hora}\n`;
    if (pasajeros) msg += `👥 Passageiros: ${pasajeros}\n`;
    if (notas)     msg += `📝 Observações: ${notas}\n`;
    msg += `\nVocês têm disponibilidade?`;
  } else {
    msg = `Hola! Quiero reservar un traslado:\n\n`;
    msg += `📍 Servicio: ${svcLabel}\n`;
    if (vuelo)     msg += `✈️ Vuelo: ${vuelo}\n`;
    if (fecha)     msg += `📅 Fecha: ${fechaFmt}\n`;
    if (hora)      msg += `🕐 Hora: ${hora}\n`;
    if (pasajeros) msg += `👥 Pasajeros: ${pasajeros}\n`;
    if (notas)     msg += `📝 Notas: ${notas}\n`;
    msg += `\n¿Tienen disponibilidad?`;
  }

  trackWA('formulario_' + lang);
  window.open(`https://wa.me/543757613215?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

/* ===== FAQ ACORDEÓN ===== */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ===== ANIMACIONES SCROLL ===== */
if ('IntersectionObserver' in window) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.service-card,.why-item,.review-card,.faq-item').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 75}ms`;
    obs.observe(el);
  });
}

/* ===== SMOOTH SCROLL ===== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const t = document.querySelector(link.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hh')) || 72;
    window.scrollTo({ top: t.offsetTop - hh, behavior: 'smooth' });
  });
});