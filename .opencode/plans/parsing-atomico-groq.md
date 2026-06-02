# Plan: Parseo atómico de template en groq.ts

Archivo: `src/lib/ai/groq.ts`

## Cambio 1 — NO_DISPONIBLE: regex y replacement con `Línea 1:` (líneas 103-108)

**REEMPLAZAR:**

```typescript
    if (noPrice) {
      // No tariff for this route — replace MODO AHORA template with clarification instruction
      const templateRegex = /"¡Hola! Sí, el precio para ir desde \*?\[Origen\]\*? a \*?\[Destino\]\*? es de \$\[PRECIO\] \(para hasta 4 pasajeros\)\.[^"]*"/;
      systemPrompt = systemPrompt.replace(templateRegex,
        `"Informá al cliente qué campo (origen/destino) no tiene tarifa según [EXTRACCION_CONFIANZA]. Mencioná exactamente cuál lugar no está disponible y por qué. Si hay una sugerencia (SUGERENCIA_ORIGEN o SUGERENCIA_DESTINO), preguntá si quiso decir ese lugar. No inventes precio. Si no se resuelve, derivá con un colega humano."`
      );
    } else {
      // 1. Pre-sustitución de precio existente
      const pm = extractionNote.match(/VALOR_PRECIO:\s*(\d+)/);
      if (pm) {
        systemPrompt = systemPrompt.replace('$[PRECIO]', `$${pm[1]}`);
      }

      // 2. NUEVO: Pre-sustitución de Origen y Destino Canónicos
      const routeMatch = extractionNote.match(/Ruta oficial:\s*(.*?)\s*→\s*(.*?)\./);
      if (routeMatch) {
        let canonicalOrigin = routeMatch[1].trim();
        let canonicalDest = routeMatch[2].trim();

        // Enriquecimiento de sinónimos para mayor claridad institucional si es el Centro
        if (canonicalDest === "Centro (Urbano)") {
          canonicalDest = "Centro de la Ciudad (Puerto Iguazú)";
        }
        if (canonicalDest === "Puerto Iguazú Centro") {
          canonicalDest = "Ciudad de Puerto Iguazú";
        }

        systemPrompt = systemPrompt.replace('[Origen]', canonicalOrigin);
        systemPrompt = systemPrompt.replace('[Destino]', canonicalDest);
      }
    }
```

**POR:**

```typescript
    if (noPrice) {
      // No tariff for this route — replace MODO AHORA template block with clarification instruction
      const templateRegex = /Línea 1: "¡Hola! Sí, el precio para ir desde \*?\[Origen\]\*? a \*?\[Destino\]\*? es de \$\[PRECIO\] \(para hasta 4 pasajeros\)\."/;
      systemPrompt = systemPrompt.replace(templateRegex,
        `Línea 1: "Informá al cliente qué campo (origen/destino) no tiene tarifa según [EXTRACCION_CONFIANZA]. Mencioná exactamente cuál lugar no está disponible y por qué. Si hay una sugerencia (SUGERENCIA_ORIGEN o SUGERENCIA_DESTINO), preguntá si quiso decir ese lugar. No inventes precio. Si no se resuelve, derivá con un colega humano."`
      );
    } else {
      // 1. Pre-sustitución atómica de Precio
      const pm = extractionNote.match(/VALOR_PRECIO:\s*(\d+)/);
      if (pm) {
        systemPrompt = systemPrompt.replace('$[PRECIO]', pm[1]);
      }

      // 2. Pre-sustitución atómica de Origen y Destino Canónicos
      const routeMatch = extractionNote.match(/Ruta oficial:\s*(.*?)\s*→\s*(.*?)\./);
      if (routeMatch) {
        let canonicalOrigin = routeMatch[1].trim();
        let canonicalDest = routeMatch[2].trim();

        // Enriquecimiento semántico institucional de sinónimos
        if (canonicalDest === "Centro (Urbano)") {
          canonicalDest = "Centro de la Ciudad (Puerto Iguazú)";
        }
        if (canonicalDest === "Puerto Iguazú Centro") {
          canonicalDest = "Ciudad de Puerto Iguazú";
        }

        systemPrompt = systemPrompt.replace('[Origen]', canonicalOrigin);
        systemPrompt = systemPrompt.replace('[Destino]', canonicalDest);
      }
    }
```

**Diferencias:**
- Regex NO_DISPONIBLE: agrega `Línea 1: ` al inicio y reemplaza `\.[^"]*"` por `\."` (match atómico de toda la línea)
- Replacement NO_DISPONIBLE: incluye `Línea 1: ` como prefijo
- Precio: cambia `` `$${pm[1]}` `` → `pm[1]` (elimina `$` del template)
- Comentarios: "existente" → "atómica", "centro" → "semántico institucional"

---

## Cambio 2 — Post-processing: regex con `$` opcional (línea ~206)

**REEMPLAZAR:**

```typescript
        response = response.replace(/\$\s*[\d.,]+/g, `$${precioReal}`);
```

**POR:**

```typescript
        response = response.replace(/\$?\s*\d[\d.,]+/g, `$${precioReal}`);
```

**Explicación:**
- `\$?` → `$` es opcional (cubre tanto `$850` como `32000`)
- `\d[\d.,]+` → al menos 2 dígitos (NO matchea `4` de "4 pasajeros")
- El replacement siempre inyecta `$` → salida final siempre con `$32000`

---

## Verificación

```bash
cd D:\arauj\Documents\PROYECTOS\GuazuTransfer-Web\GuazuTransfer-Web
npm run build
```

Si compila sin errores:
```bash
git add src/lib/ai/groq.ts
git commit -m "fix: parseo atómico de template - precios sin $ y regex con Línea 1"
git push
```
