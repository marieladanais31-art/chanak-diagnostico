# Diagnóstico Chanak v2 — cómo funciona

**Qué hace.** Evaluación adaptativa de Matemáticas e Inglés/Lectura (K–12, en inglés) más áreas complementarias (Ciencias, Geografía, Historia, Inteligencia Emocional y Biblia opcional, en español o inglés). Entrega el punto de partida por materia, las lagunas por PACE, la equivalencia con ACE, CLE, LIFEPAC y Florida, un PEI inicial y los datos listos para el SIS.

**Reglas (de A.C.E. Procedures Manual I, parafraseadas).**
- Empieza 3 niveles por debajo del grado declarado en primaria (1–6) y 5 en secundaria (7–12). Si la racha de fallos empieza en el primer PACE evaluado se baja un nivel más (hasta 2 veces).
- Un PACE = una pregunta. Tres o más fallos seguidos marcan el **nivel de desempeño** (primer PACE de la racha); los fallos anteriores son **lagunas**. Nunca se ubica por encima del grado declarado.
- Kindergarten: ≥ 80 % → preparación de nivel 1 (ABCs); < 80 % → programa de Kindergarten.
- Si la familia indica que el alumno no lee inglés se omite Inglés/Lectura y se recomienda **Reading – ABC**.
- Dual Diploma: solo Inglés y Lectura + Inteligencia Emocional.

**Arquitectura.**
- `evaluacion.html` + `js/diag-app.js` (interfaz) + `js/diag-core.js` (lógica pura, con pruebas en `tests/`).
- `api/diag-items` entrega preguntas **sin respuestas**; `api/diag-score` corrige en el servidor. Banco en `api/_bank/*.json` (no se publica como archivo estático).
- `data/placement-map.json` es la única tabla pública (rangos de PACE, nivel CLE/LIFEPAC).
- `api/diag-send` envía el resumen a la familia por Brevo. Requiere en Vercel: `DIAG_STAFF_KEY`, `BREVO_API_KEY`, `DIAG_SENDER_EMAIL`. Sin ellas responde 501.

**Banco de preguntas.** 308 preguntas originales de Matemáticas e Inglés (una por PACE, K–12) y 86 de áreas complementarias (bilingües). Todas llevan `source` (leído del diagnóstico ACE o deducido del Scope & Sequence ACE 2025). **Pendiente: revisión del mentor general antes de usar con familias.** Un ítem de Historia (dinosaurios) está en `hold` hasta que la dirección confirme el criterio.

**Pruebas locales.** `node --test tests/diag-core.test.mjs` y `node tools-dev-server.js 8790` → http://localhost:8790/evaluacion.html

## Unidades de aprendizaje (LU) — base de la plataforma
El informe y el PEI hablan de **conceptos a reforzar**, expresados como unidades de aprendizaje Chanak (`LU-MATH-04-03`, `LU-ELA-02-07`…). ACE (PACE), CLE y LIFEPAC aparecen solo como **referencia** al final (desplegable en el informe y pie del PEI).
- `docs/learning-units.json` es el catálogo semilla: 308 LU (id, materia, nivel, orden, concepto ES/EN, consejo de práctica ES/EN, eje de Florida, referencia ACE). Cada pregunta del banco lleva su `lu`.
- El payload para el SIS trae `learning_units_to_reinforce` y `continue_at` con esos ids; las referencias externas van en `references`.
- Una LU por concepto diagnóstico hoy; la plataforma podrá añadir más LU por concepto (práctica, repaso, evaluación M.L.) sin cambiar los ids.
