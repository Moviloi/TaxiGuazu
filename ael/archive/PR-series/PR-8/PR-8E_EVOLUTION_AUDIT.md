# PR-8E — Goals Evolution Audit

**Estado:** Borrador de auditoría evolutiva  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Goals posee un ciclo evolutivo independiente que justifique su existencia como capa separada.

---

## Regla

Un ciclo evolutivo independiente significa que una capa puede CAMBIAR sin que otras capas deban cambiar. Se analizan tres tipos de cambio: frecuencia, tipo, y dirección de la dependencia evolutiva.

---

## 1. ¿Qué cambios puede tener Goals?

| Tipo de cambio | Ejemplo | ¿Requiere cambio en Planning? |
|----------------|---------|:----------------------------:|
| Nuevos criterios de relevancia | "Ahora también considerar θ > 0.9 como relevante" | ✅ SÍ (Planning recibe diferentes Patterns) |
| Nueva categoría interpretativa | "Nueva categoría: 'confianza_del_usuario'" | ✅ SÍ (Planning debe saber interpretarla) |
| Nueva prioridad | "Reordenar prioridades: engagement > clarification" | ✅ SÍ (Planning ejecuta en orden) |
| Nueva intención | "Nueva intención: 'ofrecer_descuento'" | ✅ SÍ (Planning debe ejecutarla) |
| Taxonomía de intenciones | "Renombrar 'clarify' a 'ask_for_info'" | ✅ SÍ (Planning usa el mismo vocabulario) |

**TODO cambio en Goals afecta a Planning.**

## 2. ¿Puede Planning cambiar sin afectar a Goals?

| Tipo de cambio en Planning | ¿Requiere cambio en Goals? |
|---------------------------|:-------------------------:|
| Nuevo tipo de respuesta | ❌ No (misma intención, diferente ejecución) |
| Nueva optimización | ❌ No (misma intención, implementación diferente) |
| Nuevo canal de salida | ❌ No (misma intención, canal diferente) |
| Nuevo template de mensaje | ❌ No (misma intención, texto diferente) |

**Planning PUEDE evolucionar independientemente de Goals. Goals NO puede evolucionar sin afectar a Planning.**

## 3. Dependencia evolutiva asimétrica

```
Goals cambia → Planning DEBE cambiar (contrato de salida roto)
Planning cambia → Goals NO necesita cambiar (contrato de entrada intacto)
```

Esta asimetría indica que Goals NO es una capa independiente. Es una EXTENSIÓN de Planning que no tiene autonomía evolutiva.

**Misma situación que Reflection (PR-6F):**
- Reflection cambiaba → Learning debía cambiar.
- Learning cambiaba → Reflection no necesitaba cambiar.
- Conclusión: Reflection absorbido en Learning.

## 4. Veredicto

**Goals no posee ciclo evolutivo independiente. Su dependencia evolutiva con Planning es total y asimétrica. No justifica existencia como capa separada.**

PR-8E confirma PR-8A: **Goals debe eliminarse.**

---

*PR-8E. Metodología: análisis de dependencias evolutivas (misma que PR-6F para Reflection).*
