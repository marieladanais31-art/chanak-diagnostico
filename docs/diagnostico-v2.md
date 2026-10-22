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

## Enlaces personales (flujo de entrada)
- **Off-Campus:** el diagnóstico va incluido. Al enviar la matrícula en el SIS se crea un enlace y se envía por correo; también aparece en la pantalla de "Solicitud recibida".
- **Dual Diploma:** la familia paga primero la evaluación (Stripe: ES 35 €, PA 50 USD, MX 850 MXN, EE. UU. 58 USD, con `client_reference_id = DX-<folio>`). Al confirmarse el pago, el webhook del SIS crea el enlace y lo envía. El pago de la evaluación NO marca la matrícula como pagada ni se descuenta de ella.
- El enlace es de un solo uso (se consume al entregar), vence a los 30 días y fija el programa y la ruta de revisión.
- `evaluacion.html?k=<token>` precarga nombre, curso y correo. Sin enlace: si `diagnostic_settings.require_link` es `false` la página sigue abierta (modo transición); si es `true` muestra "Necesitas tu enlace personal".
- Coordinación puede crear enlaces a mano en el SIS (Matrícula → Diagnósticos → Crear enlace).

## Códigos de Florida (B.E.S.T. / NGSSS / Estudios Sociales)

Cada pregunta de Matemáticas, Inglés, Ciencias, Geografía e Historia lleva `florida_code` (p. ej. `MA.3.NSO.1.1`, `ELA.5.C.3.1`, `SC.4.L.17.1`, `SS.1.A.1.1`). Es solo **referencia** (la unidad Chanak sigue siendo la Learning Unit); se muestra en el informe y viaja en `learning_units_to_reinforce[].florida_code` hacia el PEI borrador. Inteligencia Emocional, Biblia y CEFR no tienen código de Florida.

- Catálogo de los 217 códigos usados con su enunciado: `data/florida-codes.json`.
- Fuente: texto de los estándares copiado de un espejo público; **verificar contra FLDOE/CPALMS** antes de citar oficialmente.
- La asignación pregunta→código se hizo por análisis del contenido de cada pregunta (el mentor puede corregirla); hay ~25 % de asignaciones aproximadas (conceptos sin estándar propio: números romanos, primos, redondeo…). Mantener la prueba `tests/florida-codes.test.mjs` al añadir preguntas.

## Scope & Sequence 2026–27 integrado (v2.3)

El banco se completó con lo que el Scope & Sequence oficial pide y faltaba (sin borrar nada de lo anterior):
- **Matemáticas** (`math_scope.json`, 50): valor posicional y datos (1.º), matrices (2.º), división, fracciones unitarias y área/perímetro (3.º), decimales, ángulos y fracciones equivalentes (4.º), volumen y plano (5.º), ecuaciones de un paso y estadística (6.º), probabilidad (7.º), funciones lineales y sistemas (8.º), sistemas (9.º), congruencia, trigonometría y volumen (10.º), racionales y polinomios (11.º), límites y vectores (12.º).
- **Inglés en tres destrezas:** *English Grammar* (las preguntas de siempre + escritura), *English Reading* (`ela_reading.json`, 77 preguntas con pasaje original, niveles 1–12) y *English Speaking* (grabación de voz con tareas de hablar y de leer en voz alta por banda de grado; el mentor la escucha en el SIS y la valora con rúbrica: fluidez, pronunciación, vocabulario, comprensión; es evaluación, no nota). Para Dual Diploma el Speaking también se pide (el nivel MCER ya incluye lectura).
- **Ciencias, Geografía e Historia/Civismo** (`comp_scope.json`, 56) para las 4 bandas.
- Las preguntas nuevas **no tienen PACE**: no mueven la ubicación, pero sus fallos aparecen como conceptos a reforzar (`extraGaps`), con su unidad de aprendizaje (LU) y su código de Florida. El resultado del inglés muestra el porcentaje de Gramática y de Lectura.
- Cada pregunta nueva fue resuelta a ciegas por un segundo corrector (0 discrepancias tras corregir una cifra de un pasaje). Siguen para revisión de un mentor.
- El PEI (documento imprimible) lleva una declaración fija: alineación con los estándares de Florida (B.E.S.T. y demás), currículo aprobado por Chanak de acuerdo con esos estándares, aprendizaje por dominio y enfoque cristocéntrico.
- Requiere la migración del SIS `20261039_diagnostic_audio.sql` (permite subir audio al bucket privado).
