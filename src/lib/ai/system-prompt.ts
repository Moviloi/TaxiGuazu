// v5.0 FASE 5B OUTPUT LOCK:
// system-prompt.ts ya NO se usa. El output final es responsabilidad de POLICY
// (policy-ahora.ts / policy-reserva.ts) y se redacta en código determinista.
//
// El LLM solo se invoca en generateGroqExtraction (rol CORE) usando
// extraction-prompt.ts. system-prompt.ts queda como legacy y no debe ser
// referenciado por código nuevo. Si encontrás un caller, es bypass del
// pipeline CORE → ROUTER → POLICY → OUTPUT.

const DEPRECATED_BASE_PROMPT = `
[LEGACY — NO USAR]
Este prompt pertenecía al flujo LLM-de-respuesta eliminado en v5.0 FASE 5B.
El handler.ts es la única fuente del texto que se envía al cliente.
`.trim();

export function getSystemPrompt(): string {
  return DEPRECATED_BASE_PROMPT;
}
