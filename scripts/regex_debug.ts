const ESTOY_EN_RE = /(?:estoy\s+en(?:\s+(?:el|la|los|las|al|del))?|estoy\s+ac[áa]\s+en(?:\s+(?:el|la|al))?|me\s+encuentro\s+en(?:\s+(?:el|la|al))?)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bir\b|\bvoy\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;
const IR_A_RE = /\b(?:voy|ir|quiero\s+ir|vamos)\s+(?:a\s+(?:el|la|los|las)\s+|a\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:desde|hasta|\bestoy\b|pero|\by\b|[,;.!?]|$))/i;
const DESDE_RE = /(?:desde|partiendo\s+de|saliendo\s+de)\s+(?:el\s+|la\s+|los\s+|las\s+|al\s+|del\s+)?([a-záéíóúñ][a-záéíóúñ\s]{1,40}?)(?=\s*(?:hasta|a\s+(?:el|la|los|las)|\bvoy\b|\bir\b|\bquiero\b|\bvamos\b|\bnecesito\b|pero|\by\b|[,;.!?]|$))/i;

const inputs = [
  "estoy en el aeropuerto quiero ir al centro",
  "voy al amerian desde el aeropuerto",
  "estoy en el aeropuerto",
  "ir al centro",
  "voy al aeropuerto",
  "voy al aeropuerto desde el centro",
  "estoy en el centro, voy al aeropuerto",
  "estoy aca en el hotel",
  "me encuentro en el hotel",
  "desde el hotel voy al aeropuerto",
];

for (const t of inputs) {
  console.log(`\n=== ${t} ===`);
  const e = t.match(ESTOY_EN_RE);
  console.log("ESTOY_EN:", e ? `[${e[1]}]` : "no match");
  const i = t.match(IR_A_RE);
  console.log("IR_A:", i ? `[${i[1]}]` : "no match");
  const d = t.match(DESDE_RE);
  console.log("DESDE:", d ? `[${d[1]}]` : "no match");
}



