// CATALOG — Traducciones centralizadas del sistema.
// Español (es) es la base. Portugués (pt) es la prioridad. Inglés (en) es secundario.
//
// Convención de keys: {categoría}.{subcategoría}[.{variante}]
// Strings con parámetros usan {paramName} para interpolación.

import type { Lang } from "@/lib/ai/types";

export type CatalogEntry = Record<Lang, string | ((params: Record<string, string>) => string)>;
type CatalogMap = Record<string, CatalogEntry>;

// ─── Helper: string simple ────────────────────────────────────────────────
const _ = (es: string, pt: string, en?: string): CatalogEntry => ({
  es,
  pt,
  en: en ?? es,
});

// ─── Helper: función con parámetros ──────────────────────────────────────
const fn = (
  es: (p: Record<string, string>) => string,
  pt: (p: Record<string, string>) => string,
  en?: (p: Record<string, string>) => string,
): CatalogEntry => ({
  es,
  pt,
  en: en ?? es,
});

// =========================================================================
// CATÁLOGO
// =========================================================================
export const CATALOG: CatalogMap = {
  // ─── 1. GREETING ───────────────────────────────────────────────────────
  "greeting.hi": _("¡Hola!", "Olá!", "Hi!"),
  "greeting.intro": _(
    "¡Hola! Soy Cris Virtual, asistente 24/7 de TaxiGuazú.",
    "Olá! Sou Cris Virtual, assistente 24/7 da TaxiGuazú.",
    "Hi! I'm Cris Virtual, 24/7 assistant from TaxiGuazú.",
  ),
  "greeting.introWithName": fn(
    (p) => `¡Hola ${p.name}! Soy Cris Virtual, asistente 24/7 de TaxiGuazú.`,
    (p) => `Olá ${p.name}! Sou Cris Virtual, assistente 24/7 da TaxiGuazú.`,
    (p) => `Hi ${p.name}! I'm Cris Virtual, 24/7 assistant from TaxiGuazú.`,
  ),
  "greeting.full": _(
    "¡Hola! Soy Cris Virtual, asistente 24/7 de TaxiGuazú. Decime desde dónde y hacia dónde necesitás el traslado.",
    "Olá! Sou Cris Virtual, assistente 24/7 da TaxiGuazú. Me diga de onde e para onde precisa do transfer.",
    "Hi! I'm Cris Virtual, 24/7 assistant from TaxiGuazú. Tell me where from and where to you need the transfer.",
  ),
  "greeting.info": _(
    "Estoy acá para ayudarte con información sobre traslados y paseos en Iguazú. ¿Qué querés saber?",
    "Estou aqui para ajudar com informações sobre transfers e passeios em Iguazú. O que quer saber?",
    "I'm here to help with information about transfers and tours in Iguazú. What would you like to know?",
  ),

  // ─── 2. CLARIFY ────────────────────────────────────────────────────────
  "clarify.origin": _("¿Desde dónde salís?", "De onde você está saindo?", "Where are you leaving from?"),
  "clarify.destination": _("¿A dónde necesitás ir?", "Para onde você precisa ir?", "Where do you need to go?"),
  "clarify.time": _("¿Para qué día y horario necesitás el viaje?", "Para que dia e horário você precisa da corrida?", "What date and time do you need the ride?"),
  "clarify.passengers": _("¿Cuántos pasajeros?", "Quantos passageiros?", "How many passengers?"),
  "clarify.generic": _(
    "¿Podés contarme un poco más sobre el viaje que necesitás?",
    "Pode me contar um pouco mais sobre a viagem que precisa?",
    "Can you tell me a bit more about the trip you need?",
  ),
  "clarify.locationAmbiguous": _(
    "¿Qué lugar específico y a qué hora necesitás el viaje?",
    "Qual lugar específico e a que horas precisa da viagem?",
    "What specific place and what time do you need the trip?",
  ),
  "clarify.field": fn(
    (p) => `¿Podés indicarme ${p.field}?`,
    (p) => `Pode me informar ${p.field}?`,
    (p) => `Could you provide ${p.field}?`,
  ),
  "clarify.hotel": fn(
    (p) => `¿Te referís a ${p.label} o a otra dirección específica?`,
    (p) => `Você se refere a ${p.label} no centro ou a outro endereço específico?`,
    (p) => `Do you mean ${p.label} in the city centre or a specific address?`,
  ),
  "clarify.destinationAmbiguous": _(
    "¿A qué lugar específico vas?",
    "Para qual local específico você vai?",
    "To which specific place are you going?",
  ),
  "clarify.originAmbiguous": _(
    "¿Podés indicarme un origen más específico (calle, nombre de hotel, referencia)?",
    "Pode indicar um local de origem mais específico (rua, hotel, referência)?",
    "Can you give me a more specific origin (street, hotel name, landmark)?",
  ),

  // ─── 3. PRICE ──────────────────────────────────────────────────────────
  "price.quote": fn(
    (p) => `El traslado de ${p.origin} a ${p.destination} cuesta $${p.price} ARS.`,
    (p) => `O transfer de ${p.origin} para ${p.destination} custa $${p.price} ARS.`,
    (p) => `The transfer from ${p.origin} to ${p.destination} costs $${p.price} ARS.`,
  ),
  "price.quoteWithPax": fn(
    (p) => `Perfecto, ${p.vehicle} para ${p.pax}. El traslado cuesta $${p.price} ARS.\n\n¿Confirmamos el viaje?`,
    (p) => `Perfeito, ${p.vehicle} para ${p.pax}. O transfer custa $${p.price} ARS.\n\nConfirmamos a viagem?`,
  ),
  "price.quoteSlotConfirm": fn(
    (p) => `El traslado de ${p.origin} a ${p.destination} cuesta $${p.price} ARS.\n\n¿Confirmamos el viaje?`,
    (p) => `O transfer de ${p.origin} para ${p.destination} custa $${p.price} ARS.\n\nConfirmamos a viagem?`,
  ),

  // ─── 4. CONFIRMATION ───────────────────────────────────────────────────
  "confirm.summary": _("Solo para confirmar los datos del viaje:", "Só para confirmar os dados da viagem:", "Just to confirm the trip details:"),
  "confirm.origin": _("📍 *Origen:*", "📍 *Origem:*", "📍 *Origin:*"),
  "confirm.destination": _("📍 *Destino:*", "📍 *Destino:*", "📍 *Destination:*"),
  "confirm.passengers": _("👥 *Pasajeros:*", "👥 *Passageiros:*", "👥 *Passengers:*"),
  "confirm.ask": _("¿Está correcto?", "Está correto?", "Is this correct?"),
  "confirm.buttonConfirm": _("✅ Confirmar", "✅ Confirmar", "✅ Confirm"),
  "confirm.buttonChange": _("✏️ Cambiar", "✏️ Alterar", "✏️ Change"),
  "confirm.changePrompt": _("¿Qué querés cambiar?", "O que quer alterar?", "What would you like to change?"),
  "confirm.changeField": fn(
    (p) => `Escribí el ${p.label} exacto.`,
    (p) => `Escreva o ${p.label} exato.`,
    (p) => `Write the exact ${p.label}.`,
  ),
  "confirm.labelOrigin": _("origen", "origem", "origin"),
  "confirm.labelDestination": _("destino", "destino", "destination"),
  "confirm.fieldSelectorPrompt": _(
    "El usuario debe escribir los datos a corregir en texto libre.",
    "O usuário deve escrever os dados a corrigir em texto livre.",
    "The user must write the data to correct in free text.",
  ),
  "confirm.changePassengers": _("¿Cuántos pasajeros son?", "Quantos passageiros são?"),
  "confirm.changeTime": _("¿Para qué día y horario necesitás el viaje?", "Para que dia e horário precisa da viagem?"),
  "confirm.changeBack": _("Escribí los datos de tu viaje.", "Escreva os dados da sua viagem."),
  "confirm.fallback": _(
    "¿Querés confirmar o cambiar los datos? Usá los botones de abajo 👇",
    "Quer confirmar ou alterar os dados? Use os botões abaixo 👇",
    "Do you want to confirm or change the details? Use the buttons below 👇",
  ),
  "confirm.awaitingPax": _(
    "¿Cuántos pasajeros son así busco el vehículo correcto?",
    "Quantos passageiros são para buscar o veículo correto?",
  ),
  "confirm.awaitingPaxExample": _(
    "¿Cuántos pasajeros son? (ej: 'somos 3')",
    "Quantos passageiros são? (ex: 'somos 3')",
  ),
  "confirm.reAsk": _("¿Confirmamos el viaje?", "Confirmamos a viagem?"),

  // ─── 5. DISAMBIGUATION ─────────────────────────────────────────────────
  "disamb.aeropuertoCasual": _("¿Del aeropuerto argentino o brasileño?", "Do aeroporto argentino ou brasileiro?"),
  "disamb.aeropuertoFormal": _(
    "¿Aterrizás en Puerto Iguazú (Argentina) o Foz (Brasil)?",
    "Você aterrissa em Puerto Iguazú (Argentina) ou Foz (Brasil)?",
  ),
  "disamb.aeropuertoDirecto": _(
    "¿Cuál aeropuerto? Tenemos IGR (Argentina) e IGU (Brasil)",
    "Qual aeroporto? Temos IGR (Argentina) e IGU (Brasil)",
  ),
  "disamb.centroCasual": _("¿Al centro de Puerto Iguazú o de Foz?", "Para o centro de Puerto Iguazú ou Foz?"),
  "disamb.centroDirecto": _("¿Centro argentino o brasileño?", "Centro argentino ou brasileiro?"),
  "disamb.centroFormal": _(
    "¿Te llevo al centro de Puerto Iguazú o al de Foz do Iguaçu?",
    "Te levo ao centro de Puerto Iguazú ou ao de Foz do Iguaçu?",
  ),
  "disamb.cataratasCasual": _("¿A las cataratas del lado argentino o brasileño?", "Para as cataratas do lado argentino ou brasileiro?"),
  "disamb.cataratasDirecto": _("¿Cataratas argentinas o brasileñas?", "Cataratas argentinas ou brasileiras?"),
  "disamb.cataratasFormal": _(
    "¿Querés visitar el Parque Nacional Iguazú (Argentina) o el Parque Nacional do Iguaçu (Brasil)?",
    "Quer visitar o Parque Nacional Iguazú (Argentina) ou o Parque Nacional do Iguaçu (Brasil)?",
  ),
  "disamb.hotelCasual": _("¿Me decís el nombre del hotel?", "Me diz o nome do hotel?"),
  "disamb.hotelFormal": _("¿En qué hotel te alojás?", "Em que hotel você está hospedado?"),
  "disamb.hotelDirecto": _("¿Cuál es el nombre del hotel?", "Qual é o nome do hotel?"),
  "disamb.genericoCasual": _("¿Podés ser más específico con el lugar?", "Pode ser mais específico com o lugar?"),
  "disamb.genericoFormal": _("¿A qué lugar exacto te referís?", "A que lugar exato você se refere?"),
  "disamb.genericoDirecto": _("¿Cuál lugar exactamente?", "Qual lugar exatamente?"),
  "disamb.notFound": _(
    "Todavía no encuentro el lugar exacto. ¿Podés decirme el nombre específico?",
    "Ainda não encontro o lugar exato. Pode me dizer o nome específico?",
    "I still can't find the exact place. Can you tell me the specific name?",
  ),
  "disamb.notFoundAlt": _(
    "No encontré ese lugar. ¿Podés escribir el nombre exacto?",
    "Não encontrei esse lugar. Pode escrever o nome exato?",
    "I couldn't find that place. Can you write the exact name?",
  ),
  "disamb.writeExact": _("Escribí el lugar exacto.", "Escreva o lugar exato.", "Write the exact place."),
  "disamb.writeExactWith": fn(
    (p) => `Escribí el ${p.label} exacto (ej: ${p.examples}).`,
    (p) => `Escreva o ${p.label} exato (ex: ${p.examples}).`,
    (p) => `Please write the exact ${p.label} (e.g., ${p.examples}).`,
  ),
  "disamb.contextualOrigin": fn(
    (p) => `Entendí que salís de ${p.place}. ¿Decís ${p.alternatives}?`,
    (p) => `Entendi que você sai de ${p.place}. Você diz ${p.alternatives}?`,
    (p) => `I understand you're departing from ${p.place}. Do you mean ${p.alternatives}?`,
  ),
  "disamb.contextualDest": fn(
    (p) => `Entendí que vas a ${p.place}. ¿Decís ${p.alternatives}?`,
    (p) => `Entendi que você vai para ${p.place}. Você diz ${p.alternatives}?`,
    (p) => `I understand you're going to ${p.place}. Do you mean ${p.alternatives}?`,
  ),
  "disamb.contextualHigh": fn(
    (p) => `Entendí que ${p.slotKey === "origin" ? "salís" : "vas"} de ${p.place}. ¿A qué lugar exacto te referís?`,
    (p) => `Entendi que você ${p.slotKey === "origin" ? "sai de" : "vai para"} ${p.place}. Qual lugar exato você quer dizer?`,
    (p) => `I understand you ${p.slotKey === "origin" ? "depart from" : "go to"} ${p.place}. What exact place do you mean?`,
  ),
  "disamb.contextualGeneric": fn(
    (p) => `Entendí que mencionaste ${p.place}. ¿Me decís el ${p.slotKey === "origin" ? "origen" : "destino"} exacto?`,
    (p) => `Vi que você mencionou ${p.place}. Pode me dizer o ${p.slotKey === "origin" ? "local de partida" : "destino"} exato?`,
    (p) => `I see you mentioned ${p.place}. Can you tell me the exact ${p.slotKey === "origin" ? "starting point" : "destination"}?`,
  ),
  "disamb.noRawTerm": fn(
    (p) => `¿Me decís el ${p.slotKey === "origin" ? "origen" : "destino"} exacto?`,
    (p) => `Pode me dizer o ${p.slotKey === "origin" ? "local de partida" : "destino"} exato?`,
    (p) => `Could you tell me the exact ${p.slotKey === "origin" ? "starting point" : "destination"}?`,
  ),
  "disamb.fieldSelector": _(
    "¿Qué querés cambiar? Escribí el origen y destino correctos.",
    "O que quer alterar? Escreva a origem e destino corretos.",
    "What would you like to change? Write the correct origin and destination.",
  ),

  // ─── 6. RECOVERY ───────────────────────────────────────────────────────
  "recovery.contextual": fn(
    (p) => `Entendí que mencionaste "${p.mentioned}". ¿A dónde necesitás ir?`,
    (p) => `Entendi que você mencionou "${p.mentioned}". Para onde precisa ir?`,
    (p) => `I see you mentioned "${p.mentioned}". Where do you need to go?`,
  ),

  // ─── 7. RE-ENGAGEMENT ─────────────────────────────────────────────────
  "reengagement.idle": fn(
    (p) => `¿Todavía necesitás el traslado de ${p.origin} a ${p.destination}? Decime y te ayudo a coordinar.`,
    (p) => `Ainda precisa do transfer de ${p.origin} para ${p.destination}? Me diga e ajudo a coordenar.`,
  ),
  "reengagement.slotConfirmation": _(
    "¿Seguís necesitando el viaje? Confirmame los datos y lo gestionamos.",
    "Ainda precisa da viagem? Confirme os dados e a gente gerencia.",
  ),
  "reengagement.collecting": _(
    "¡Hola! ¿Necesitás ayuda con un traslado? Decime desde dónde y hacia dónde y te paso los precios.",
    "Olá! Precisa de ajuda com um transfer? Me diga de onde e para onde e passo os preços.",
  ),
  "reengagement.generic": _(
    "¡Hola! ¿Necesitás ayuda con un traslado?",
    "Olá! Precisa de ajuda com um transfer?",
  ),

  // ─── 8. ERROR ──────────────────────────────────────────────────────────
  "error.fallback": _(
    "No pude procesar eso. Un operador te va a asistir en breve.",
    "Não consegui processar isso. Um operador vai te atender em breve.",
    "I couldn't process that. An operator will assist you shortly.",
  ),
  "error.escalation": _(
    "No entendí bien tu consulta. Un operador humano te va a contactar para ayudarte.",
    "Não entendi bem sua consulta. Um operador humano vai entrar em contato para ajudar.",
    "I didn't quite understand your query. A human operator will contact you to help.",
  ),
  "error.global": _(
    "Disculpe, ocurrió un error. Un operador lo asistirá.",
    "Desculpe, ocorreu um erro. Um operador vai te atender.",
    "Sorry, an error occurred. An operator will assist you.",
  ),

  // ─── 9. DISPATCH ───────────────────────────────────────────────────────
  "dispatch.searching": _(
    "Buscando chofer disponible para tu viaje. Te avisamos cuando alguien tome el servicio.",
    "Procurando motorista disponível para sua viagem. Avisamos quando alguém aceitar o serviço.",
    "Looking for an available driver for your trip. We'll let you know when someone takes the service.",
  ),

  // ─── 10. BOOKING ──────────────────────────────────────────────────────
  "booking.confirmed": fn(
    (p) => `✅ Solicitud confirmada.\n\nOrigen: ${p.origin}\nDestino: ${p.destination}\nPrecio: $${p.price} ARS\n\nEn breve un chofer se pondrá en contacto con vos.`,
    (p) => `✅ Solicitação confirmada.\n\nOrigem: ${p.origin}\nDestino: ${p.destination}\nValor: R$ ${p.price} ARS\n\nEm breve um motorista entrará em contato.`,
    (p) => `✅ Booking confirmed.\n\nFrom: ${p.origin}\nTo: ${p.destination}\nPrice: $${p.price} ARS\n\nA driver will contact you shortly.`,
  ),
  "booking.confirmedNoPrice": fn(
    (p) => `✅ Solicitud confirmada.\n\nOrigen: ${p.origin}\nDestino: ${p.destination}\n\nUn operador va a confirmar disponibilidad y precio final. En breve un chofer se pondrá en contacto con vos.`,
    (p) => `✅ Solicitação confirmada.\n\nOrigem: ${p.origin}\nDestino: ${p.destination}\n\nUm operador vai confirmar disponibilidade e valor final. Em breve um motorista entrará em contato.`,
    (p) => `✅ Booking confirmed.\n\nFrom: ${p.origin}\nTo: ${p.destination}\n\nAn operator will confirm availability and final price. A driver will contact you shortly.`,
  ),
  "booking.summary": fn(
    (p) => `Resumen del viaje:\nOrigen: ${p.origin}\nDestino: ${p.destination}\nPasajeros: ${p.pax}\n...\nPrecio: $${p.price} ARS (hasta 4/6 pasajeros).\n\n¿Confirmás?`,
    (p) => `Resumo da viagem:\nOrigem: ${p.origin}\nDestino: ${p.destination}\nPassageiros: ${p.pax}\n...\nPreço: $${p.price} ARS (até 4/6 passageiros).\n\nConfirma?`,
  ),
  "booking.noTariff": fn(
    (p) => `No encontré una tarifa publicada para esa ruta (${p.origin} → ${p.destination}). Un operador va a confirmar disponibilidad y precio final. ¿Querés que sigamos?`,
    (p) => `Não localizei uma tarifa publicada para essa rota (${p.origin} → ${p.destination}). Um operador vai confirmar disponibilidade e valor final. Deseja prosseguir?`,
    (p) => `I couldn't find a published rate for that route (${p.origin} → ${p.destination}). An operator will confirm availability and final price. Do you want to proceed?`,
  ),
  "booking.acknowledgePax": fn(
    (p) => `Perfecto. Tengo origen en ${p.origin} y destino hacia ${p.dest}. ¿Cuántos pasajeros son?`,
    (p) => `Certo. Origem: ${p.origin}. Destino: ${p.dest}. Quantos passageiros?`,
    (p) => `Got it. Origin: ${p.origin}. Destination: ${p.dest}. How many passengers?`,
  ),
  "booking.acknowledgeTime": fn(
    (p) => `Perfecto. Tengo origen en ${p.origin} y destino hacia ${p.dest}. ¿A qué hora necesitás el traslado?`,
    (p) => `Certo. Origem: ${p.origin}. Destino: ${p.dest}. A que horas você precisa da corrida?`,
    (p) => `Got it. Origin: ${p.origin}. Destination: ${p.dest}. What time do you need the ride?`,
  ),
  "booking.postConfirm": fn(
    (p) => `Gracias por confirmar los datos de tu viaje 🚖\n\n📍 De: ${p.origin}\n📍 A: ${p.dest}\n\nEstamos verificando la tarifa y te la confirmamos en breve por este chat.`,
    (p) => `Obrigado por confirmar os dados da sua viagem 🚖\n\n📍 De: ${p.origin}\n📍 A: ${p.dest}\n\nEstamos verificando a tarifa e confirmamos em breve por este chat.`,
  ),
  "booking.confirmedSimple": fn(
    (p) => `Confirmado ✅ ${p.vehicle} para ${p.pax}. El traslado cuesta $${p.price} ARS.\n\nBuscando chofer...`,
    (p) => `Confirmado ✅ ${p.vehicle} para ${p.pax}. O transfer custa $${p.price} ARS.\n\nProcurando motorista...`,
  ),
  "booking.confirmedSimpleNoPrice": fn(
    (p) => `Confirmado ✅ para ${p.pax}.\n\nBuscando chofer...`,
    (p) => `Confirmado ✅ para ${p.pax}.\n\nProcurando motorista...`,
  ),
  "booking.reservation": _(
    "Tu reserva quedó registrada. Te confirmamos horario y chofer en breve.",
    "Sua reserva foi registrada. Confirmamos horário e motorista em breve.",
  ),

  // ─── 11. POLICY ──────────────────────────────────────────────────────────
  "policy.ahoraAnswer": _(
    ", para tarifas y disponibilidad, un operador te va a asistir en breve.",
    ", para valores e disponibilidade, um operador vai te atender em breve.",
    ", for pricing and availability, an operator will assist you shortly.",
  ),
  "policy.ahoraSafeFallback": _(
    ", no entendí. ¿Podés repetir?",
    ", não entendi. Pode reformular?",
    ", I didn't catch that. Could you rephrase?",
  ),

  // ─── 12. EMERGENCY / RESCHEDULE / POST-SERVICE ────────────────────────
  "emergency.response": _(
    "🚨 Estamos notificando a nuestro equipo. Un operador te va a contactar urgente.",
    "🚨 Estamos notificando nossa equipe. Um operador entrará em contato urgente.",
    "🚨 We're notifying our team. An operator will contact you urgently.",
  ),
  "reschedule.response": _(
    "Entendido. Un operador va a revisar tu reserva y te contacta para reprogramar.",
    "Entendido. Um operador vai revisar sua reserva e entrar em contato para reprogramar.",
    "Understood. An operator will review your reservation and contact you to reschedule.",
  ),
  "postService.response": _(
    "Gracias por tu mensaje. Si necesitás ayuda con facturación o tenés algún reclamo, un operador te va a contactar.",
    "Obrigado pela mensagem. Se precisar de ajuda com faturamento ou tiver alguma reclamação, um operador entrará em contato.",
    "Thank you for your message. If you need help with billing or have a complaint, an operator will contact you.",
  ),

  // ─── 13. OPPORTUNITY ──────────────────────────────────────────────────
  "opportunity.noPricing": _(
    "Primero necesito saber el trayecto para verificar beneficios disponibles.",
    "Primeiro preciso saber o trajeto para verificar benefícios disponíveis.",
  ),
  "opportunity.offer": fn(
    (p) => `${p.description} ¿Te interesa recibir información?`,
    (p) => `${p.description} Tem interesse em receber informações?`,
  ),
  "opportunity.accepted": fn(
    (p) => `Perfecto. Te comparto información sobre ${p.label}.`,
    (p) => `Perfeito. Compartilho informações sobre ${p.label}.`,
  ),
  "opportunity.declined": _(
    "Entendido. Quedamos a disposición.",
    "Entendido. Ficamos à disposição.",
  ),
  "opportunity.noneAvailable": _(
    "Por el momento no hay beneficios adicionales disponibles para esta ruta. El precio oficial ya es el mejor que podemos ofrecer.",
    "No momento não há benefícios adicionais disponíveis para esta rota. O preço oficial já é o melhor que podemos oferecer.",
  ),
  "opportunity.applied": _("✅ *Beneficios ya aplicados al precio:*", "✅ *Benefícios já aplicados ao preço:*"),
  "opportunity.available": _("🎯 *Oportunidades disponibles:*", "🎯 *Oportunidades disponíveis:*"),
  "opportunity.savings": _("ahorro", "economia"),
  "opportunity.validUntil": _("válido hasta", "válido até"),

  // ─── 14. FLEET ─────────────────────────────────────────────────────────
  "fleet.unavailable": _(
    "Actualmente no tenemos vehículos disponibles. Para reservar, comuníquese con un operador.",
    "Atualmente não temos veículos disponíveis. Para reservar, entre em contato com um operador.",
  ),
  "fleet.capacityExceeded": fn(
    (p) => `Actualmente nuestra flota admite hasta ${p.maxCapacity} pasajeros por vehículo. Para grupos mayores, comuníquese con un operador.`,
    (p) => `Atualmente nossa frota permite até ${p.maxCapacity} passageiros por veículo. Para grupos maiores, entre em contato com um operador.`,
  ),
  "fleet.noTariff": _(
    "Por el momento no tenemos una tarifa configurada para esa cantidad de pasajeros. Comuníquese con un operador para coordinar el viaje.",
    "No momento não temos uma tarifa configurada para essa quantidade de passageiros. Entre em contato com um operador para coordenar a viagem.",
  ),

  // ─── 15. COMMERCIAL ───────────────────────────────────────────────────
  "commercial.prompt": _(
    "Para tarifas y disponibilidad, indicame tu recorrido y cuántos pasajeros son.",
    "Para tarifas e disponibilidade, me informe seu trajeto e quantos passageiros são.",
    "For pricing and availability, please let me know your route and number of passengers.",
  ),

  // ─── 16. PASSENGER ────────────────────────────────────────────────────
  "passenger.limit": fn(
    (p) => `Máximo 6 pasajeros por vehículo. Para ${p.pax} pasajeros necesitarían 2 vehículos. Contactanos para coordinar.`,
    (p) => `Máximo 6 passageiros por veículo. Para ${p.pax} passageiros precisariam de 2 veículos. Contacte-nos para coordenar.`,
  ),

  // ─── 17. CANCELLATION ─────────────────────────────────────────────────
  "cancel.confirmed": _(
    "No hay problema. Se canceló la confirmación. Avísame si necesitás algo más.",
    "Sem problema. A confirmação foi cancelada. Me avise se precisar de mais algo.",
  ),

  // ─── 18. CONFIRMATION QUESTION ────────────────────────────────────────
  "confirm.question": fn(
    (p) => `Perfecto, te llevo de ${p.origin} a ${p.destination}. ¿Correcto?`,
    (p) => `Perfeito, te levo de ${p.origin} para ${p.destination}. Correto?`,
  ),

  // ─── 19. FINALIZE AMBIGUITY ───────────────────────────────────────────
  "finalize.summary": fn(
    (p) => `Solo para confirmar los datos del viaje:\n\n📍 *Origen:*\n✅ ${p.origin}\n\n📍 *Destino:*\n✅ ${p.dest}\n\n¿Está correcto?`,
    (p) => `Só para confirmar os dados da viagem:\n\n📍 *Origem:*\n✅ ${p.origin}\n\n📍 *Destino:*\n✅ ${p.dest}\n\nEstá correto?`,
    (p) => `Just to confirm the trip details:\n\n📍 *Origin:*\n✅ ${p.origin}\n\n📍 *Destination:*\n✅ ${p.dest}\n\nIs this correct?`,
  ),

  // ─── 20. DRIVER NOTIFICATIONS ─────────────────────────────────────────
  "driver.reconfirmTitle": _("🔄 *Reconfirmación de viaje*", "🔄 *Reconfirmação de viagem*"),
  "driver.reconfirmBody": fn(
    (p) => `Quedan 24hs para el viaje a *${p.destination}*\n📅 ${p.date}\n\n¿Confirmás que vas a realizarlo?`,
    (p) => `Faltam 24h para a viagem para *${p.destination}*\n📅 ${p.date}\n\nConfirma que vai realizar?`,
  ),
  "driver.reconfirmYes": _("✅ Confirmado", "✅ Confirmado"),
  "driver.reconfirmNo": _("❌ No puedo", "❌ Não posso"),
  "driver.preTrip": _(
    "🌟 *Todo listo para tu viaje*\n\nRecordá que tu chofer asignado se contactará con vos antes del servicio para coordinar todos los detalles.\n\nCualquier cambio, avisanos por este chat.",
    "🌟 *Tudo pronto para sua viagem*\n\nLembre-se que seu motorista designado entrará em contato antes do serviço para coordenar todos os detalhes.\n\nQualquer alteração, avise-nos por este chat.",
  ),
  "driver.closureTitle": _("📊 *Cierre de viaje*", "📊 *Fechamento de viagem*"),
  "driver.closureBody": fn(
    (p) => `Destino: ${p.destination}\nComisión: $${p.commission}\n\n¿Confirmás la comisión declarada?`,
    (p) => `Destino: ${p.destination}\nComissão: $${p.commission}\n\nConfirma a comissão declarada?`,
  ),
  "driver.closureConfirm": _("✅ Confirmar", "✅ Confirmar"),
  "driver.closureReview": _("📝 Revisar", "📝 Revisar"),
};

// Tipo helper para type safety — no es un enum real, solo para documentación
export type CatalogKey = string;
