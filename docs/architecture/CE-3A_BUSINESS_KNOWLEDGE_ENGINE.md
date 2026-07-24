# CE-3A — Business Knowledge Engine: Diseño Arquitectónico

> **Fecha:** 2026-07-15  
> **Driver:** Diseñar la arquitectura del Business Knowledge Engine (BKE) como una nueva capa explícita del sistema que consume las fuentes de verdad existentes y encapsula el conocimiento del dominio.  
> **Rol:** Arquitecto Principal  
> **Prerrequisitos:** CE-1 (Cognitive Efficiency Audit), CE-2 (Inevitability Classification)  
> **Documentos relacionados:** FCER-1, ADR-005, arquitectura actual del pipeline (`handler.ts`, `lead.service.ts`, `ambiguity-handler.ts`, `policies/`)  

---

> **Estado:** ARCHIVE CANDIDATE — Diseño redefinido por ADR-014 (2026-07-20). Código BKE eliminado de `src/lib/bke/`. El Cognitive Escalation Principle (ADR-012) se preserva como diseño conceptual para re-evaluación post-v1. Este documento se conserva como referencia de diseño y trazabilidad histórica.

## Preámbulo

Este documento define la arquitectura conceptual del Business Knowledge Engine (BKE), una nueva capa del sistema cuyo propósito es encapsular el conocimiento del dominio de TaxiGuazú en una API interna de consultas de alto nivel.

El BKE **no es una nueva base de datos**. El BKE **no duplica información**. El BKE consume exclusivamente las fuentes de verdad existentes (Turso, configuración, constantes, reglas determinísticas, templates conversacionales) y expone una interfaz unificada de consultas semánticas del dominio.

**No se implementan componentes. No se escriben clases ni interfaces finales. No se modifica código existente.** Este documento establece la arquitectura conceptual que servirá como base para la planificación de la migración en etapas posteriores de la Serie CE.

---

## 1. Propósito

### 1.1 Responsabilidad del BKE

El Business Knowledge Engine es la **API interna del dominio de conocimiento de TaxiGuazú**. Su responsabilidad es responder preguntas del negocio consultando las fuentes de verdad existentes, sin duplicar datos y sin ejecutar lógica conversacional.

Responde a preguntas como:
- "Dado este texto, ¿qué lugares conocidos existen?"
- "¿Cuál es la tarifa entre el lugar A y el lugar B para N pasajeros?"
- "¿Qué fronteras se cruzan en una ruta entre A y B?"
- "¿Cuál es el alias conocido para 'IGR'?"
- "¿Qué campos son obligatorios para un viaje de tipo 'reserva'?"
- "¿Cuál es el mensaje de confirmación en portugués?"

### 1.2 Problemas arquitectónicos que resuelve

| Problema identificado en CE-1/CE-2 | Cómo lo aborda el BKE |
|------------------------------------|------------------------|
| **Conocimiento del dominio disperso**: las reglas de negocio, aliases, y datos del dominio están distribuidos entre prompts LLM (`extraction-prompt.ts`, `iguazu-knowledge.ts`), JSON files (`places.json`, `borders.json`), código determinístico (`regex-extractor.ts`, `entity-extractor.ts`), y templates (`disambiguation-templates.ts`, `response-builder.ts`) | Centraliza el **acceso** al conocimiento — no los datos — en una capa de consulta única. Cada fuente de verdad permanece donde está; el BKE sabe cómo consultarla |
| **Llamadas LLM reemplazables**: CE-2 clasificó C3 (interpretAmbiguity) como reemplazable porque su espacio de búsqueda es acotado y los datos existen en DB | El BKE provee una alternativa determinística para consultas de desambiguación que actualmente requieren LLM |
| **Duplicación de lógica de dominio**: reglas de frontera, conocimiento geográfico, y relaciones entre lugares aparecen tanto en prompts LLM como en código determinístico | El BKE se convierte en la fuente única de lógica de dominio; los prompts LLM ya no necesitan contener conocimiento del dominio |
| **Acoplamiento entre conocimiento y orquestación**: los orquestadores (O1-O5) mezclan lógica de negocio con lógica de control de flujo | El BKE extrae el conocimiento fuera de los orquestadores, dejándolos responsables solo del flujo |

### 1.3 Límites de la capa

| Dentro del alcance del BKE | Fuera del alcance del BKE |
|----------------------------|---------------------------|
| Consultas sobre lugares, tarifas, fronteras, alias | Generación de lenguaje natural |
| Recuperación de mensajes reutilizables | Redacción de respuestas al usuario |
| Clasificación de viajes (tipo, categoría) | Comprensión de intención conversacional |
| Determinación de campos obligatorios | Detección de frustración |
| Resolución de ambigüedad geográfica | Estrategia de respuesta |
| Consulta de reglas de negocio (límites, restricciones) | Decisión de política (AHORA vs RESERVA) |
| Mapeo de alias a entidades canónicas | Persistencia de datos |

El BKE **no conversa**. El BKE **no decide políticas**. El BKE **no genera texto**. El BKE **responde consultas del dominio**.

---

## 2. Fuentes de Conocimiento

El BKE consume exclusivamente fuentes de verdad existentes. No replica datos. Cada fuente de conocimiento se consulta en su origen.

### 2.1 Turso Database

| Tabla / Consulta | Conocimiento que aporta | Ubicación actual del consumo |
|------------------|------------------------|------------------------------|
| `places` | Nombres canónicos, place_id, zona, ciudad, país, tipo de lugar, score turístico, estado activo | `src/lib/db/domains/geo.ts` — `searchPlaces()`, `findPlaceByName()` |
| `aliases` | Alias de lugares (texto alternativo → place_id canónico) | `src/lib/db/domains/geo.ts` — `findPlaceByAlias()` |
| `zones` | Zonas geográficas para resolución de tarifas | `src/lib/services/pricing/tariff-repository.ts` — resolución 4 niveles |
| `tariffs`, `promotions`, `provider_adjustments`, `packages` | Tarifas, reglas comerciales, descuentos | `src/lib/services/pricing/` — `commercial-pricing-engine.ts`, `tariff-repository.ts` |
| `tours` | Precios de tours y viajes de ida y vuelta, horas de espera | `src/lib/services/pricing/tour-resolver.ts` |
| `chat_sessions` | Estado de sesión, slots persistentes | `lead.service.ts`, `ambiguity-handler.ts` |

### 2.2 Configuración

| Variable/Constante | Conocimiento que aporta | Ubicación actual |
|--------------------|------------------------|------------------|
| `GROQ_*`, `TIMEOUT_*` | Límites operativos (timeouts, tokens) | `src/config/constants.ts` |
| `CONFIDENCE_PROCEED=0.7`, `CONFIDENCE_CLARIFY=0.3` | Umbrales de confianza del sistema | `src/config/constants.ts` |
| `DISCOUNT_MAX_EXPLICIT=15`, `STANDARD_DISCOUNT=10` | Reglas de descuento | `src/config/constants.ts` |
| `SESSION_INACTIVITY_48H_S=172800` | Límites de tiempo de sesión | `src/config/constants.ts` |

### 2.3 Constantes de negocio

| Constante | Conocimiento que aporta | Ubicación actual |
|-----------|------------------------|------------------|
| `Z_AIRPORT→Z_CITY_CORE=0.65`, `Z_HOTEL_ZONE→Z_CITY_CORE=0.8` | Proximidad entre zonas para desambiguación | `src/lib/services/geo/location-resolver.ts` — `PAIR_BASE` matrix (20 pares) |
| Corredor bonus (+0.15), Border penalty (-0.5) | Reglas de puntuación de rutas | `src/lib/services/geo/location-resolver.ts` |
| Max 6 pasajeros por vehículo | Restricción operativa | `handler.ts`, `i18n catalog` |
| `AIRPORT_RE`, `HOTEL_RE` | Clasificación de tramos | `src/lib/services/geo/location-resolver.ts` |

### 2.4 Reglas determinísticas existentes

| Regla | Conocimiento que aporta | Ubicación actual |
|-------|------------------------|------------------|
| 17 códigos IATA de aeropuertos | Identificación de aeropuertos en texto | `src/lib/services/extraction/regex-extractor.ts` |
| 10 patrones regex de hoteles conocidos | Identificación de hoteles en texto | `src/lib/services/extraction/entity-extractor.ts` |
| 8 patrones regex de POIs conocidos | Identificación de puntos de interés | `src/lib/services/extraction/entity-extractor.ts` |
| Direccionales (desde/hacia, origen/destino) | Asignación de roles a lugares | `src/lib/services/extraction/entity-extractor.ts` |
| 3 risk nodes (aeropuerto, centro, aduana) | Desambiguación de términos ambiguos críticos | `src/lib/services/workflow/ambiguity-handler.ts` (hardcodeados) |
| 12 grupos de captura regex para ubicaciones | Extracción posicional de lugares | `src/lib/services/extraction/regex-extractor.ts` |
| Niveles de resolución tarifaria (4 niveles) | Prioridad de tarifa lugar→lugar > lugar→zona > zona→lugar > zona→zona | `src/lib/services/pricing/tariff-repository.ts` |
| Reglas de pasajeros (clamping 1-6) | Limitación de pasajeros | `src/lib/services/pricing/pricing-engine.ts` |
| 10 entidades con dominios y alias | Reconocimiento de entidades turísticas | `src/lib/config/entity-catalog.ts` |
| 5 contextos de desambiguación × 3 tonos | Templates de pregunta desambiguadora | `src/lib/ai/disambiguation-templates.ts` |

### 2.5 Templates conversacionales

| Recurso | Conocimiento que aporta | Ubicación actual |
|---------|------------------------|-------------------|
| 89 entradas i18n en ES/PT/EN | Mensajes reutilizables del sistema | `src/lib/services/i18n/catalog.ts` |
| 19 funciones de respuesta | Construcción de mensajes operativos | `src/lib/ai/response-builder.ts` |
| 4 políticas + escalamiento | Reglas de decisión y prompts de LLM | `data/knowledge/policies/*.json` |
| 3 schemas de validación | Estructura esperada de cada política | `src/lib/ai/policies/*.schema.ts` |
| Prompts de conocimiento (4 generadores) | Contexto para LLM sobre lugares, atracciones, fronteras, migración | `src/lib/ai/iguazu-knowledge.ts`, `taxiguazu-knowledge.ts` |
| Prompt de extracción | Instrucciones + schema JSON para LLM | `src/lib/ai/extraction-prompt.ts` |

### 2.6 Mapa de relaciones entre fuentes

```
Fuente de verdad           Capa de acceso actual         BKE (nueva capa)
───────────────            ────────────────────          ─────────────────
Turso DB (places,          geo.ts (searchPlaces,         BKE.consultarLugar()
  aliases, zones,           findPlaceByAlias,             BKE.resolverAlias()
  tariffs, tours,           findPlaceByName,              BKE.obtenerTarifa()
  promotions,               getPlaceZone)                 BKE.clasificarTrayecto()
  adjustments, packages,   pricing/ (tariff-repository,   BKE.obtenerCamposRequeridos()
  chat_sessions)            tariff-resolver,              BKE.obtenerMensaje()
                            pricing-engine,
                            commercial-pricing-engine,
                            tour-resolver,
                            hub-discount)

Config/env                 constants.ts, env.ts          BKE.obtenerLimites()
                                                          BKE.obtenerUmbrales()

JSON files                 iguazu-knowledge.ts           BKE.obtenerInfoFronteriza()
  (places.json,             taxiguazu-knowledge.ts        BKE.obtenerInfoAtracciones()
   borders.json,           response-builder.ts           BKE.obtenerInfoMigracion()
   attractions.json,       disambiguation-templates.ts   BKE.obtenerInfoCalendario()
   operations.json,
   calendar.json)

Reglas determinísticas     regex-extractor.ts            BKE.extraerUbicaciones()
                           entity-extractor.ts           BKE.identificarEntidades()
                           entity-catalog.ts              BKE.resolverEntidad()
                           location-resolver.ts           BKE.calcularProximidad()

Templates                  catalog.ts (i18n)             BKE.obtenerMensaje()
                           response-builder.ts            BKE.construirMensaje()
                           slot-confirmation.ts

Políticas                  policy-ahora.ts               (fuera del alcance —
                           policy-reserva.ts              las políticas deciden,
                           escalation.json                el BKE informa)
```

---

## 3. Dominios del Conocimiento

Cada dominio representa un área de conocimiento del negocio de TaxiGuazú que el BKE debe encapsular.

### 3.1 Lugares (Places)

**Conocimiento encapsulado:**
- 36 lugares con nombre canónico, place_id, zona, ciudad, país, tipo (airport, hotel, park, border, etc.)
- ~125 alias conocidos (ej: "Cataratas" → "Cataratas del Iguazú", "IGR" → "Aeropuerto IGR")
- Coordenadas de zona, relevancia turística (score 0-100)
- 17 códigos IATA de aeropuertos regionales
- 3 risk nodes geográficos (aeropuerto, centro, aduana) con sus 3 variantes por país

**Ya existe en:** Turso (places + aliases tables), `places.json`, `regex-extractor.ts` (códigos IATA), `entity-extractor.ts` (hoteles + POIs), `ambiguity-handler.ts` (risk nodes)

**Justificación como dominio independiente:** Es la base de todo el sistema de transporte. Aparece en extracción, desambiguación, tarifas, y respuesta al usuario. El 100% de los flujos conversacionales dependen de la resolución de lugares.

### 3.2 Tarifas (Pricing)

**Conocimiento encapsulado:**
- Tarifas por tramo (lugar→lugar, lugar→zona, zona→lugar, zona→zona) — 4 niveles de prioridad
- Precios para 4 y 6 pasajeros
- Reglas comerciales: promociones (pct), ajustes de proveedor (pct), paquetes (precio fijo), campañas TG
- Límite: descuentos nunca superan el markup (protección de precio base)
- Precios piso (driver price vs public price)
- Tours: precio ida y vuelta, horas de espera, cruce de frontera, waypoints
- Hub discount: descuento multi-tramo (auto-learn con factor 0.9)
- Niveles de vehículo: premium, normal, low (con factor low_piso 0.8)

**Ya existe en:** Turso (tariffs, promotions, provider_adjustments, packages, tours), `pricing-engine.ts`, `commercial-pricing-engine.ts`, `tariff-repository.ts`, `tariff-resolver.ts`, `tour-resolver.ts`, `hub-discount.ts`, `constants.ts`

**Justificación como dominio independiente:** Es el dominio más completo y mejor encapsulado del sistema actual. Tiene 7 archivos dedicados, lógica de negocios compleja, y múltiples fuentes de datos. El BKE debe exponerlo como una consulta unificada.

### 3.3 Alias (Aliases)

**Conocimiento encapsulado:**
- ~125 alias de lugares en 3 idiomas
- 10 entidades turísticas con alias (rafain, itaipu, cataratas, etc.)
- 10 patrones de hoteles con regex (amerian, meliá, rafain, mabu, panoramic, etc.)
- 8 patrones de POIs con regex (aduana, centro, cataratas, terminal, etc.)
- Mapeo de texto → entidad canónica (con o sin normalización de acentos)

**Ya existe en:** Turso (aliases table, con place_id + alias), `entity-catalog.ts` (entidades + dominios), `entity-extractor.ts` (regex), `places.json` (125 alias), `iguazu-knowledge.ts` (findKnownPlace)

**Justificación como dominio independiente:** Los alias son el puente entre el lenguaje natural del usuario y los datos estructurados del sistema. Actualmente están dispersos en 5 ubicaciones distintas con diferentes niveles de acceso.

### 3.4 Hoteles (Hotels)

**Conocimiento encapsulado:**
- 10 hoteles conocidos con nombre canónico y alias (Belmond Cataratas, Gran Meliá Iguazú, Bourbon Cataratas, DoubleTree by Hilton, Amérian Portal, Mabu Thermas, Wish Foz, Loi Suites, Iguazú Grand, Recanto Cataratas, Vivaz Cataratas)
- Patrones regex para detección en texto (10 patrones)
- Zona de ubicación de cada hotel

**Ya existe en:** `places.json` (10 hoteles), `entity-extractor.ts` (10 regex), `entity-catalog.ts` (rafain, mabu como entidades)

**Justificación como dominio independiente:** Los hoteles son el tipo de lugar más frecuente en las solicitudes de traslado. Tienen sus propios alias, patrones de detección, y reglas de negocio (ej: hoteles dentro de parques nacionales tienen accesos restringidos).

### 3.5 Aeropuertos (Airports)

**Conocimiento encapsulado:**
- 3 aeropuertos de la triple frontera: IGR (Puerto Iguazú AR), IGU (Foz do Iguaçu BR), AGT (Ciudad del Este PY)
- 17 códigos IATA regionales adicionales (AEP, EZE, COR, etc.)
- Distancias y tiempos: IGR→centro PI (25 km, ~25 min), IGU→centro Foz (13 km, ~15 min), AGT→CDE (25 km, ~40 min)
- Protocolo aeroportuario: punto de encuentro (salida de baggage claim), cartelería, monitoreo de demoras, 90 min de espera gratuita

**Ya existe en:** `places.json` (3 aeropuertos), `regex-extractor.ts` (17 códigos), `iguazu-knowledge.ts` (distancias), `operations.json` (protocolo)

**Justificación como dominio independiente:** Los traslados aeropuerto son el segmento de mayor valor y frecuencia. Cada aeropuerto tiene reglas específicas (protocolo de recepción, tiempos de migración, cartelería preferred).

### 3.6 Fronteras (Borders)

**Conocimiento encapsulado:**
- 3 fronteras: AR↔BR (Tancredo Neves), BR↔PY (Puente de la Amistad), AR↔PY (sin control directo, vía Corredor Turístico)
- Tiempos de migración: Tancredo 10-30 min normal, Amistad 15-45 min
- Horarios: Tancredo lado AR 24h, BR 06:00-22:00
- Manifiesto: obligatorio AR↔BR, digital, ~5 min
- Franquicias aduaneras: AR USD 500, BR USD 1,000, PY USD 500
- eVisa: US/CA/AU para BR (USD 80.90, 5-10 días hábiles)
- Pre-Cadastro QR: obligatorio para BR
- Seguro: obligatorio para BR (mín USD 30k), recomendado AR, no requerido PY
- Documentación por nacionalidad: AR (DNI/Pasaporte), BR (RG/Pasaporte), PY (CI/Pasaporte), Mercosur (DNI/Pasaporte), Resto (Pasaporte + visa posible)
- Vehículo: pasajeros no descienden en Tancredo; en Amistad no hay carril preferencial

**Ya existe en:** `borders.json` (25 items, 5 secciones), `migration.json` (7 secciones), `operations.json` (secciones borderCrossing y driverAssistance), `iguazu-knowledge.ts` (getBordersDetailPrompt, getMigrationDetailPrompt)

**Justificación como dominio independiente:** La triple frontera es el contexto geográfico único de TaxiGuazú. Las reglas migratorias y aduaneras son complejas, cambian por nacionalidad, y son esenciales tanto para la operación como para la respuesta al usuario.

### 3.7 Atracciones y Tours (Attractions & Tours)

**Conocimiento encapsulado:**
- 12 atracciones con precios y horarios (Parques Nacionales AR/BR, Macuco Safari, Parque das Aves, Itaipú, Marco das Fronteiras, etc.)
- 3 atracciones distantes: Minas de Wanda (40 km), San Ignacio Miní (250 km), Saltos del Moconá (300 km)
- Calendario comercial: luna llena, feriados AR/BR/PY (30+ eventos), temporadas (alta/media/baja)
- 10 entidades del catálogo con dominios temáticos (SHOW_TURISTICO, ATRACCION, TOUR, HOTEL)
- Tours multi-tramo con waypoints, horas de espera, cruce de frontera

**Ya existe en:** `attractions.json` (12 atracciones), `entity-catalog.ts` (10 entidades), `calendar.json` (21 items, 5 secciones), `tour-resolver.ts` (BD), `hub-discount.ts`

**Justificación como dominio independiente:** Las atracciones son el principal motivo de viaje después de traslados aeropuerto. Los paquetes turísticos (tour + traslado) son un producto diferenciador.

### 3.8 Esperas y Tiempos (Wait Charges & Timing)

**Conocimiento encapsulado:**
- Tiempo de espera gratuito en aeropuerto: 90 min (monitoreo satelital de vuelos)
- Horas de espera default en tours auto-learned: 2 horas
- Timeouts operativos: NIVEL_1 (60 min), NIVEL_2 (30 min), NIVEL_3 (8 min), WAITING_DRIVER (3 min)
- Tiempos de confirmación: CONFIRMATION_TIMEOUT (30 min), STALE_LEAD_TIMEOUT (30 min), CONTEXT_SLOT_TIMEOUT (60 min)
- Horarios de atención para inferencia de tiempo: horarios de apertura de lugares
- Tiempos de migración por frontera (documentados en sección 3.6)

**Ya existe en:** `constants.ts` (7 constantes de timeout), `operations.json` (90 min espera aeropuerto), `borders.json` (tiempos migración), `hub-discount.ts` (2h default), `slot-confirmation.ts` (inferencia por horarios)

**Justificación como dominio independiente:** Las esperas y tiempos son transversales a múltiples dominios (aeropuertos, tours, fronteras) y tienen impacto directo en pricing y experiencia del usuario.

### 3.9 Conductores y Flota (Drivers & Fleet)

**Conocimiento encapsulado:**
- Protocolo de contacto: conductor contacta pasajero directamente
- Punto de encuentro aeropuerto: salida de baggage claim
- Cartelería preferred: tablet con logo + nombre del pasajero
- Identificación digital: foto, nombre, teléfono, datos del vehículo
- Acompañamiento migratorio: conductor acompaña en migraciones
- Acompañamiento shopping CDE: anti-scam, guía a tiendas certificadas
- Idiomas: ES/PT fluido, EN técnico
- No es guía turístico certificado
- Asistencia con formularios aduaneros y Pre-Cadastro QR

**Ya existe en:** `operations.json` (secciones coordination + driverAssistance + airportProtocol)

**Justificación como dominio independiente:** Los conductores son el componente humano del servicio. Las reglas de interacción conductor-pasajero son parte del conocimiento operativo que el sistema debe conocer para responder preguntas y establecer expectativas.

### 3.10 Restricciones (Restrictions)

**Conocimiento encapsulado:**
- Máximo 6 pasajeros por vehículo
- Documentación requerida por nacionalidad
- Requisitos para menores (autorización parental)
- Requisitos para mascotas (certificado + chip para BR)
- Productos restringidos en aduana (armas, drogas, CITES, alimentos)
- Reglas de vehículo en fronteras (no descender en Tancredo)
- eVisa obligatoria para US/CA/AU viajando a BR

**Ya existe en:** `constants.ts` (max 6), `migration.json` (documentación), `operations.json` (reglas), `catalog.ts` (mensajes de error)

**Justificación como dominio independiente:** Las restricciones son reglas de negocio que el sistema debe conocer para filtrar solicitudes inválidas y establecer expectativas correctas en el usuario.

### 3.11 Mensajes Reutilizables (Reusable Messages)

**Conocimiento encapsulado:**
- 89 entradas de catálogo i18n en ES/PT/EN distribuidas en 22 categorías funcionales
- 5 contextos de desambiguación × 3 tonos = 15 templates conversacionales
- 19 funciones de construcción de respuestas operativas
- 3 mensajes de error (fallback, escalación, global)
- 4 mensajes de re-engagement (idle, slot_confirmation, collecting, generic)
- Mensajes de driver notification (7 entradas: reconfirmación, pre-viaje, cierre)
- Mensajes de booking (10 entradas: confirmación, resumen, post-confirmación)

**Ya existe en:** `catalog.ts` (89 entradas), `disambiguation-templates.ts` (15 templates), `response-builder.ts` (19 builders), `slot-confirmation.ts`, `policy-ahora.ts` (mensajes de política)

**Justificación como dominio independiente:** Es la única fuente de mensajes visibles al usuario. Actualmente está fragmentada en 5 archivos. El BKE debe unificar el acceso manteniendo cada template en su fuente.

---

## 4. Servicios Conceptuales

El BKE expone consultas de alto nivel. Cada servicio responde una pregunta del dominio utilizando una o más fuentes de verdad.

### 4.1 Resolución de Lugares

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `resolverLugar(texto, contexto)` | Texto libre del usuario + contexto de sesión (idioma, slots existentes) | Lugar canónico + place_id + tipo + score de confianza | Turso (places + aliases), entity-catalog, regex patterns, risk nodes |
| `buscarLugares(texto, limite)` | Texto parcial | Lista de candidatos con score | Turso (searchPlaces) |
| `resolverAlias(texto)` | Alias conocido | Lugar canónico + place_id | Turso (aliases), entity-catalog, places.json |
| `desambiguarLugar(termino, candidatos, contexto)` | Término ambiguo + lista de candidatos DB + contexto geográfico (origen/destino conocido) | Candidato seleccionado + justificación | Zonas, PAIR_BASE matrix, idioma detectado, riesgo de frontera |

### 4.2 Consulta de Tarifas

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `obtenerTarifa(origen, destino, pasajeros)` | Lugares canónicos + cantidad de pasajeros | Precio final + desglose + nivel de tarifa | Turso (tariffs, promotions, adjustments, packages) |
| `obtenerTarifaTour(origen, destino, tipo, pasajeros)` | Lugares + tipo (round_trip/tour) + pax | Precio tour + horas de espera + waypoints | Turso (tours) |
| `calcularDescuentoMultiTramo(tramos)` | Lista de tramos | Descuento aplicable + precio por tramo | Hub discount engine |

### 4.3 Identificación de Categoría de Viaje

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `clasificarTrayecto(origen, destino)` | Lugares canónicos | Tipo: local / cross_border / airport_transfer / tour / intercity | Location-resolver (AIRPORT_RE, HOTEL_RE, proximity matrix, border detection) |
| `determinarFronteras(origen, destino)` | Lugares canónicos | Lista de fronteras a cruzar con tiempos estimados | borders.json, migration.json |
| `clasificarEntidad(texto)` | Texto del usuario | Entidades detectadas con dominios temáticos | entity-catalog.ts |

### 4.4 Determinación de Campos Requeridos

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `obtenerCamposRequeridos(tipoViaje, modo)` | Tipo (reservation/dispatch/info) + modo (ahora/reserva) | Lista de campos obligatorios con prioridad | Domain profiles (comprehension.ts), policy rules |
| `obtenerSiguienteCampoPendiente(slotsActuales, tipoViaje)` | Slots ya recolectados + tipo de viaje | Campo faltante + pregunta asociada | Session state, domain profiles |

### 4.5 Recuperación de Mensajes

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `obtenerMensaje(clave, idioma, contexto)` | Clave i18n + idioma (es/pt/en) + contexto opcional (ej: nombre de lugar) | Texto del mensaje con placeholders resueltos | catalog.ts, response-builder.ts |
| `obtenerTemplateDesambiguacion(contexto, tono, idioma)` | Contexto (aeropuerto/centro/cataratas/hotel/generico) + tono (casual/formal/directo) + idioma | Template de pregunta desambiguadora | disambiguation-templates.ts |

### 4.6 Consulta de Restricciones

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `validarLimitePasajeros(cantidad)` | Número de pasajeros | Válido / inválido + mensaje de error | constants.ts, catalog.ts |
| `obtenerDocumentacionRequerida(nacionalidad)` | Nacionalidad del usuario | Documentos requeridos + visa + seguro | migration.json |
| `obtenerInfoMigracion(origen, destino)` | Lugares de origen y destino | Reglas migratorias aplicables + tiempos estimados | migration.json, borders.json |

### 4.7 Consulta de Contexto Geográfico

| Consulta | Entrada | Salida conceptual | Fuentes de verdad |
|----------|---------|-------------------|-------------------|
| `calcularProximidad(origen, destino)` | Lugares canónicos | Score de proximidad (0-1) + factor de corredor | location-resolver.ts (PAIR_BASE) |
| `obtenerDistanciaTiempo(origen, destino)` | Lugares canónicos | Distancia en km + tiempo estimado | iguazu-knowledge.ts (distancias hardcodeadas) |
| `obtenerHotelesProximos(lugar)` | Lugar canónico | Lista de hoteles cercanos | places.json, geo queries |
| `obtenerInfoTemporada(fecha)` | Fecha | Temporada (alta/media/baja) + feriados próximos | calendar.json |

---

## 5. Integración Arquitectónica

### 5.1 Diagrama de inserción del BKE

```
ESTADO ACTUAL (desde CE-1 Sección 3.1)     │   CON BKE (nueva capa)
────────────────────────────────────────────│─────────────────────────────────
                                            │
lead.service.ts                             │  lead.service.ts
  │                                         │    │
  ├─ comprehension-runner (O4)              │    ├─ comprehension-runner (O4)
  │   └─ C5, C4, C6 (LLM)                  │    │   └─ C5, C4, C6 (LLM) ← sin cambios
  │                                         │    │      en clasificación A o B
  ├─ extraction-pipeline (O5)               │    │
  │   └─ extract-slots (O3)                 │    ├─ extraction-pipeline (O5)
  │       ├─ regex-extractor                │    │   └─ extract-slots (O3)
  │       ├─ entity-extractor               │    │       ├─ regex-extractor
  │       └─ C1: generateGroqExtraction     │    │       ├─ entity-extractor
  │                                         │    │       └─ C1: generateGroqExtraction
  ├─ startAmbiguityResolution (O2)          │    │
  │   └─ C3: interpretAmbiguity × 4         │    ├─ startAmbiguityResolution (O2)
  │                                         │    │   ├──► BKE.desambiguarLugar()
  │                                         │    │   └─ C3: interpretAmbiguity × 4
  └─ handleMessage (O1)                     │    │       (solo si BKE falla)
      └─ C2: generateLLMResponse            │    │
                                            │    └─ handleMessage (O1)
                                            │        ├─► BKE.obtenerMensaje() (templates)
                                            │        └─ C2: generateLLMResponse
                                            │            (solo para personalización)
                                            │
                                            │  ┌─────────────────────────────┐
                                            │  │        BUSINESS            │
                                            │  │     KNOWLEDGE ENGINE       │
                                            │  │                             │
                                            │  │  • resolverLugar()          │
                                            │  │  • obtenerTarifa()          │
                                            │  │  • clasificarTrayecto()     │
                                            │  │  • desambiguarLugar()       │
                                            │  │  • obtenerCamposRequeridos()│
                                            │  │  • obtenerMensaje()         │
                                            │  │  • validarRestricciones()   │
                                            │  └──────────┬──────────────────┘
                                            │             │
                                            │     ┌───────┴────────┐
                                            │     │  Fuentes de    │
                                            │     │  Verdad (Turso,│
                                            │     │  Config, JSON, │
                                            │     │  Constantes)   │
                                            │     └────────────────┘
```

### 5.2 Interacción con CORE

**Relación actual:** CORE (handler.ts) produce `CoreDecision` con `intent`, `confidence`, `facts`. Estos facts contienen señales del dominio (ej: `"origin:aeropuerto"`, `"location_ambiguous:true"`) que actualmente son consumidas por comprehension y policies.

**Interacción con BKE:** CORE puede consultar al BKE para enriquecer sus facts con conocimiento del dominio:
- `BKE.clasificarTrayecto(origenRaw, destinoRaw)` → facts adicionales para enriquecer `core.facts`
- `BKE.resolverLugar(texto, contexto)` → pre-resolución de lugares mencionados antes de extracción formal
- `BKE.obtenerInfoTemporada(fecha)` → facts estacionales

El CORE **no depende** del BKE. El BKE es una fuente de datos opcional que CORE puede consultar para mejorar la calidad de sus decisiones.

### 5.3 Interacción con POLICY

**Relación actual:** POLICY (policy-ahora, policy-reserva) recibe `HandlerContext` y produce `PolicyOutput` con `finalResponse` (template con placeholders), `decision`, `requiresConfirmation`, y metadatos. Las políticas actualmente contienen reglas de decisión embebidas en su código.

**Interacción con BKE:** POLICY puede consultar al BKE para obtener datos del dominio sin tener que importar acceso a DB directamente:
- `BKE.obtenerTarifa(origen, destino, pasajeros)` → precio para incluir en respuesta
- `BKE.obtenerMensaje(clave, lang, contexto)` → template de respuesta con placeholders resueltos
- `BKE.obtenerCamposRequeridos(tipoViaje, modo)` → qué falta para completar la reserva
- `BKE.validarLimitePasajeros(cantidad)` → validación de restricciones

La POLICY **llama al BKE cuando necesita datos del dominio**. La decisión de qué política aplicar sigue siendo de POLICY.

### 5.4 Interacción con StrategyDecision

**Relación actual:** `computeStrategyDecision()` recibe facts, purchaseIntent, urgency, y produce strategyDecision con tone, speed, responseLength, skipLLM, y behaviorFlags.

**Interacción con BKE:** StrategyDecision puede consultar al BKE para decisiones contextuales:
- `BKE.clasificarTrayecto(origen, destino)` → influye en tone y speed (ej: viaje fronterizo → tono más formal)
- `BKE.obtenerInfoTemporada(fecha)` → influye en urgency y reassuranceNeeded (ej: temporada alta → más urgencia)

StrategyDecision **consume datos del BKE** pero mantiene su propia lógica de decisión estratégica.

### 5.5 Interacción con Conversation Interpreter

**Relación actual:** `interpretMessage()` en `handler.ts` produce messageType, isCorrection, y análisis de la conversación. El Conversation Interpreter usa CORE facts para clasificar el mensaje.

**Interacción con BKE:** Conversation Interpreter puede consultar al BKE para interpretación semántica:
- `BKE.resolverLugar(texto, contexto)` → detectar si el mensaje menciona lugares
- `BKE.identificarEntidades(texto)` → detectar entidades turísticas en el texto
- `BKE.clasificarEntidad(texto)` → determinar dominios temáticos del mensaje

### 5.6 Interacción con Pattern Discovery

**Relación actual:** Pattern Discovery (`pd-service.ts`) es puramente algorítmico (CE-1 Sección 7.4). No usa LLM. Opera sobre memory snapshots.

**Interacción con BKE:** Pattern Discovery puede consultar al BKE para enriquecer su análisis con conocimiento estable del dominio:
- `BKE.clasificarTrayecto(o, d)` → etiquetar patrones con categorías de viaje
- `BKE.obtenerInfoTemporada(f)` → correlacionar patrones con estacionalidad
- `BKE.calcularProximidad(o, d)` → métricas geoespaciales para patrones de ruta

Pattern Discovery **consume datos del BKE** pero su pipeline de descubrimiento sigue siendo autónomo.

### 5.7 Interacción con el Pipeline Principal

**Relación actual:** El pipeline (`lead.service.ts`) orquesta comprehension → extraction → ambiguity → handler. Cada etapa tiene acceso a DB, configuración, y servicios directamente.

**Interacción con BKE:** El pipeline puede usar el BKE como capa de abstracción:
- Reemplazar acceso directo a Turso desde orquestadores con consultas BKE
- Reducir la cantidad de imports de DB y config en cada orquestador
- Unificar el acceso a mensajes reutilizables (hoy fragmentado en catalog, response-builder, disambiguation-templates)

El pipeline **no depende del BKE** para funcionar. El BKE es un reemplazo gradual del acceso directo a fuentes de verdad desde los orquestadores.

---

## 6. Relación con los LLM

### 6.1 Llamadas clasificadas como C (Reemplazables) — Ámbito primario del BKE

CE-2 clasificó una llamada como C (Reemplazable):

| Punto | Función | Propósito | Cómo lo resuelve el BKE |
|:-----:|---------|-----------|-------------------------|
| **C3** | `interpretAmbiguity()` | Desambiguar nombres de lugares con contexto geográfico | `BKE.desambiguarLugar(termino, candidatos, contexto)` usando la matriz de proximidad de zonas (PAIR_BASE), scores de relevancia turística (DB), idioma detectado, y reglas de corredor/frontera existentes en `location-resolver.ts` |

**Análisis detallado de C3:**

La llamada C3 actual:
1. Recibe `candidates[]` desde `searchPlaces()` en Turso — datos estructurados con place_id, canonical_name, city, country, place_type, tourist_relevance_score
2. Recibe el texto original del usuario
3. Recibe el slot (origin/destination)
4. Opcionalmente recibe el otro slot resuelto como contexto
5. LLM retorna un número del 1 al N — una clasificación

El BKE puede replicar esta clasificación consultando:
- **PAIR_BASE matrix** (20 pares de zonas con scores 0.2-0.9) — ya existe en `location-resolver.ts`
- **tourist_relevance_score** de cada candidato — ya existe en DB Turso
- **Idioma detectado** — ya disponible en `detectLangWithFallback()`
- **Risk nodes hardcodeados** (aeropuerto, centro, aduana) — ya existen en `ambiguity-handler.ts`
- **Reglas de corredor** (+0.15 bonus) y **border penalty** (-0.5) — ya existen en `location-resolver.ts`

El BKE no necesita LLM para esta tarea porque:
1. El espacio de búsqueda es acotado (~50 lugares)
2. Los datos de scoring existen estructurados en DB
3. La lógica de proximidad entre zonas ya está implementada
4. El output es una clasificación (no generación de texto)

### 6.2 Llamadas clasificadas como B (Simplificables) — Ámbito secundario

CE-2 clasificó dos llamadas como B (Simplificables):

| Punto | Función | Propósito | Cómo lo asiste el BKE |
|:-----:|---------|-----------|-----------------------|
| **C4** | `generateReinterpretResponse()` | Reinterpretar mensaje antes de escalación humana | El BKE puede proporcionar `BKE.obtenerMensaje("escalation.reinterpret", lang, contexto)` como paso previo a la llamada LLM. Si el template es suficiente, no se necesita LLM |
| **C6** | `generateContextualRecovery()` | Pregunta aclaratoria contextual con ambigüedad | El BKE puede proporcionar `BKE.obtenerTemplateDesambiguacion(contexto, tono, lang)` combinado con `BKE.resolverLugar(texto, contexto)` para construir la pregunta sin LLM |

Para C4 y C6, el BKE **reduce la frecuencia** de las llamadas LLM al proveer alternativas determinísticas para los casos más comunes. El LLM se usa solo cuando el BKE no puede resolver.

### 6.3 Llamadas clasificadas como A (Inevitales) — Fuera del alcance del BKE

Las 4 llamadas clasificadas como A (C1, C2, C5, C7) **no son reemplazadas por el BKE**. Sin embargo, el BKE puede **asistirlas**:

- **C1 (extractSlots):** el BKE puede proveer `BKE.extraerUbicaciones(texto)` y `BKE.identificarEntidades(texto)` como entrada para el prompt de extracción, reduciendo la cantidad de contexto que el LLM necesita procesar
- **C2 (generateLLMResponse):** el BKE puede proveer `BKE.obtenerMensaje(clave, lang, contexto)` como fallback determinístico, permitiendo que el sistema responda incluso sin LLM (actualmente ya existe como template en policy)
- **C5 (generateFrustrationResponse):** el BKE puede proveer `BKE.obtenerMensaje("frustration.respuesta", lang, contexto)` como primer nivel de respuesta antes de recurrir al LLM
- **C7 (transcribeAudio):** el BKE no tiene relación (transcripción de audio es inherentemente IA)

### 6.4 Estrategia de reemplazo progresivo

```
Fase 1: BKE reemplaza C3
  Actual:   ambiguity-handler → interpretAmbiguity (LLM) × 4
  Futuro:   ambiguity-handler → BKE.desambiguarLugar() → si retorna null → interpretAmbiguity (LLM)

Fase 2: BKE asiste C4, C6
  Actual:   comprehension → generateReinterpretResponse (LLM) / generateContextualRecovery (LLM)
  Futuro:   comprehension → BKE.obtenerMensaje() → si no es suficiente → LLM

Fase 3: BKE como fuente de contexto para C1, C2, C5
  Actual:   prompts LLM contienen conocimiento del dominio embebido
  Futuro:   BKE provee datos estructurados → prompts LLM más cortos y enfocados
```

---

## 7. Principios de Diseño

### 7.1 Source of Truth Única

El BKE no almacena datos. Cada consulta se resuelve consultando la fuente de verdad original. Si los datos cambian en Turso, en configuración, o en los JSON files, el BKE refleja el cambio inmediatamente sin migración ni sincronización.

**Implicación arquitectónica:** El BKE es una capa de acceso, no una capa de almacenamiento. No tiene estado propio ni caché persistente.

### 7.2 No Duplicación de Datos

El BKE duplica cero información. Las 36 entradas de lugares existen en Turso, no en el BKE. Las 89 entradas de mensajes i18n existen en el catálogo, no en el BKE. Las reglas de proximidad entre zonas existen en `location-resolver.ts`, no en el BKE.

**Implicación arquitectónica:** El tamaño del BKE es función de la cantidad de consultas que expone, no de la cantidad de datos que conoce.

### 7.3 Encapsulación del Conocimiento

El conocimiento del dominio está disperso en 20+ archivos (CE-1 identifica 12 archivos de consumo LLM + sus fuentes de datos). El BKE encapsula todo el acceso a este conocimiento en una capa visible y documentada. Un nuevo desarrollador puede entender qué sabe el sistema sobre tarifas, lugares, o fronteras mirando un solo lugar.

**Implicación arquitectónica:** Las consultas al BKE son explícitas (función con nombre) en lugar de implícitas (SQL embebido en un orquestador, regex en un archivo de extracción).

### 7.4 Independencia de la Persistencia

El BKE abstrae el origen de los datos. Hoy las fuentes son Turso + JSON + configuración. Mañana podrían ser una API externa, un archivo YAML, o un servicio de terceros. Los consumidores del BKE no saben ni necesitan saber dónde están los datos.

**Implicación arquitectónica:** Cambiar la fuente de un dominio (ej: migrar places de JSON a Turso) no afecta a los consumidores del BKE.

### 7.5 Consultas de Alto Nivel

El BKE responde preguntas del dominio, no queries de datos. `BKE.obtenerTarifa("Aeropuerto IGR", "Centro de Puerto Iguazú", 3)` es una consulta de negocio. `SELECT * FROM tariffs WHERE origin_place_id = ? AND destination_place_id = ?` es una query técnica.

**Implicación arquitectónica:** El lenguaje del BKE es el lenguaje del dominio de TaxiGuazú: lugares, tarifas, fronteras, tours, esperas.

### 7.6 Compatibilidad con Futuras Fuentes de Datos

La interfaz del BKE está diseñada para agregar fuentes sin cambiar consumidores. Si surge una nueva fuente de datos (ej: API de precios dinámicos, base de datos de conductores), se agrega como nueva fuente en el BKE sin modificar los consumidores existentes.

**Implicación arquitectónica:** Los consumidores dependen de la interfaz del BKE, no de las fuentes concretas.

### 7.7 Separación de Responsabilidades

El BKE no conversa. El BKE no decide políticas. El BKE no genera texto. El BKE responde consultas del dominio. La separación es:

| Capa | Responsabilidad |
|------|-----------------|
| **BKE** | Responder preguntas sobre el dominio: lugares, tarifas, fronteras, alias, restricciones, mensajes |
| **POLICY** | Decidir qué hacer: AHORA vs RESERVA, EXECUTE vs CLARIFY vs ANSWER |
| **LLM** | Generar lenguaje natural: respuestas personalizadas, comprensión de matices, empatía |
| **Orquestador** | Controlar el flujo: qué hacer, en qué orden, cuándo detenerse |

### 7.8 Compatibilidad con el Escalamiento de Inteligencia

El BKE es la base del escalamiento explícito de inteligencia (hoy ausente según CE-1 Sección 7.2):

```
Nivel 0 → BKE (determinístico, sin LLM)
Nivel 1 → Si BKE no puede resolver → orquestador decide
Nivel 2 → Si orquestador lo requiere → LLM (solo clasificación A)
```

Esta estructura permite que el sistema funcione sin LLM (como hoy en producción, CE-1 Sección 6.4) con respuestas funcionales basadas en BKE, y que escale a LLM cuando esté disponible.

---

## 8. Riesgos

### 8.1 Riesgos Arquitectónicos

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R1 | **Sobrecarga de abstracción** | El BKE podría convertirse en una capa que simplemente envuelve llamadas existentes sin agregar valor arquitectónico, añadiendo complejidad innecesaria | Cada consulta del BKE debe resolver un problema de dominio real identificado en CE-1/CE-2. No crear consultas "por si acaso" |
| R2 | **God object** | El BKE podría crecer hasta abarcar todo el conocimiento del sistema, convirtiéndose en un monolito del cual todos los componentes dependen | El BKE se organiza por dominios independientes (lugares, tarifas, fronteras, etc.). Ningún dominio depende de otro. Los consumidores dependen solo de los dominios que necesitan |
| R3 | **Duplicación inadvertida** | Si el BKE no se mantiene disciplinado, podría comenzar a cachear o replicar datos de sus fuentes, violando el principio de no duplicación | El BKE debe medir en cada consulta: "¿esto consulta la fuente de verdad o replica datos?" |
| R4 | **Acoplamiento a la implementación actual** | Las fuentes de verdad actuales (Turso schema, JSON structure) podrían cambiar, requiriendo cambios en el BKE | El BKE encapsula las consultas. Si Turso cambia, solo cambia la implementación interna de la consulta BKE afectada, no sus consumidores |
| R5 | **Dependencia secuencial** | Si el pipeline se vuelve dependiente del BKE (ej: BKE debe responder antes de que el pipeline continúe), una falla del BKE podría detener todo el flujo | El BKE debe tener fallback en todos los casos. Si falla, el pipeline continúa sin BKE (degradación gradual, no corte total) |

### 8.2 Riesgos Operativos

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R6 | **Latencia adicional** | Cada consulta BKE puede implicar múltiples queries a DB, sumando latencia a un pipeline que ya es sensible al tiempo (timeouts de 5000ms en Groq, 1800s en confirmación) | El BKE debe diseñar consultas que minimicen viajes de ida y vuelta (round-trips) a las fuentes. Las consultas frecuentes deben ser rápidas |
| R7 | **Mantenimiento del conocimiento** | El BKE se convierte en un nuevo artefacto que mantener. Cuando cambien las reglas de negocio, hay que actualizar el BKE además de las fuentes | El BKE es código, no datos. Cambiar reglas de negocio implica cambiar código del BKE, que tiene tests, revisión, y despliegue. Esto es una ventaja (control) y un costo (mantenimiento) |
| R8 | **Coexistencia con el acceso directo actual** | Durante la migración, algunos componentes accederán al BKE y otros directamente a las fuentes, creando dos caminos para el mismo dato | La migración debe ser por dominio: un dominio completo se migra al BKE de una vez. No migrar mitades de dominio |

### 8.3 Riesgos de Reemplazo de LLM

| ID | Riesgo | Descripción | Mitigación conceptual |
|:--:|--------|-------------|-----------------------|
| R9 | **Cobertura incompleta** | El BKE puede no cubrir todos los casos que el LLM resolvía para C3, resultando en degradación de la desambiguación | El BKE implementa primero las reglas determinísticas existentes (PAIR_BASE, risk nodes, scores). El LLM se mantiene como fallback hasta que el BKE demuestre cobertura suficiente |
| R10 | **Complejidad de mantenimiento de reglas** | Las reglas de desambiguación determinísticas (PAIR_BASE, border penalty, corredor bonus) requieren mantenimiento activo cuando cambia la geografía o las rutas | Las reglas de desambiguación ya existen y se mantienen en `location-resolver.ts`. El BKE no las duplica, las consume. Si cambian, el BKE cambia automáticamente |
| R11 | **Pérdida de contexto conversacional** | El LLM considera el contexto completo de la conversación para desambiguar; las reglas determinísticas tienen acceso limitado al historial | El BKE recibe parámetros de contexto (idioma, sesión, slots existentes) explícitamente. No necesita el historial completo; necesita los datos relevantes |

---

## 9. Conclusión

### 9.1 Rol del BKE en la arquitectura cognitiva

El Business Knowledge Engine es la capa que introduce **conocimiento explícito del dominio** donde actualmente solo existe **conocimiento implícito** distribuido entre prompts LLM, código determinístico, y datos fragmentados.

Su función en la arquitectura cognitiva es triple:

1. **Reemplazar llamadas LLM reemplazables**: el BKE provee la alternativa determinística para C3 (interpretAmbiguity), la única llamada clasificada como C en CE-2, eliminando hasta 4 llamadas LLM por mensaje en el escenario máximo.

2. **Simplificar llamadas LLM simplificables**: el BKE provee alternativas determinísticas de primer nivel para C4 (generateReinterpretResponse) y C6 (generateContextualRecovery), reduciendo la frecuencia con la que estas llamadas necesitan recurrir al LLM.

3. **Asistir llamadas LLM inevitables**: el BKE provee contexto estructurado y conocimiento del dominio para C1 (extractSlots), C2 (generateLLMResponse), y C5 (generateFrustrationResponse), permitiendo que los prompts LLM sean más cortos, más enfocados, y sin conocimiento del dominio embebido.

### 9.2 Impacto en el presupuesto cognitivo

Con BKE reemplazando C3 y asistiendo C4/C6:

| Escenario | Sin BKE (CE-1) | Con BKE | Reducción |
|-----------|:--------------:|:-------:|:---------:|
| Ambigüedad completa | 4 llamadas LLM (C3×4) | 0-1 llamadas (BKE resuelve, LLM fallback) | 75-100% |
| Comprensión baja + ambigüedad | 3 llamadas LLM (C4, C6, C5) | 1-2 llamadas (BKE asiste, LLM para casos complejos) | 33-66% |
| Máximo teórico | 10 llamadas | 2-5 llamadas | 50-80% |

### 9.3 Relación con el escalamiento de inteligencia

El BKE es el Nivel 0 del escalamiento de inteligencia del sistema (hoy ausente según CE-1 Sección 7.2). Provee una base determinística que funciona sin LLM (crítico dado el estado de producción documentado en CE-1 Sección 6) y que escala a LLM solo cuando es necesario.

La pirámide de inteligencia con BKE:

```
                    ┌───────────────────────┐
                    │   Nivel 2: LLM (A)    │  ← solo llamadas inevitables
                    │   (C1, C2, C5, C7)    │     (personalización, empatía,
                    └───────────────────────┘      extracción compleja, audio)
                              ▲
                    ┌───────────────────────┐
                    │   Nivel 1: BKE + LLM  │  ← simplificación (C4, C6)
                    │   asiste / fallback    │     BKE intenta, LLM si falla
                    └───────────────────────┘
                              ▲
                    ┌───────────────────────┐
                    │   Nivel 0: BKE (C)    │  ← reemplazo (C3)
                    │   determinístico      │     sin LLM, datos existentes
                    └───────────────────────┘
```

### 9.4 Estado actual del conocimiento

CE-1 y la exploración de fuentes revelan que el sistema **ya posee** el conocimiento necesario para el BKE en más de 20 archivos distribuidos: datos estructurados en Turso (lugares, alias, tarifas), lógica determinística (location-resolver, regex-extractor, entity-extractor, entity-catalog), templates (catalog i18n, response-builder, disambiguation-templates), y reglas de negocio (policies, constants, JSON knowledge files).

El BKE no requiere nueva información. Requiere **encapsular y unificar** la información existente.

---

*Fin de CE-3A — Business Knowledge Engine: Diseño Arquitectónico. Este documento constituye la base conceptual para la planificación de la migración en etapas posteriores de la Serie CE.*
