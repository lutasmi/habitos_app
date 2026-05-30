# V1_TEST_CHECKLIST.md

Lista de verificación manual para validar el funcionamiento completo de la app antes de uso en producción.

**Cómo usar este checklist:**
- Ejecutar en orden, de arriba abajo.
- Marcar cada ítem con ✅ (correcto), ❌ (fallo) o ⚠️ (comportamiento inesperado).
- Si un ítem falla, no continuar hasta resolverlo salvo que se indique lo contrario.
- La columna "Verificar en" indica dónde comprobar el resultado.

---

## 1. Configuración inicial en Google Sheets

**Prerequisito:** Apps Script desplegado como Web App. URL copiada en `.env`.

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 1.1 | Abrir `?action=ping` en el navegador | `{ "ok": true, "data": { "pong": true, "version": "phase2-date-upsert-v3" } }` | Navegador |
| 1.2 | Abrir `?action=setup` en el navegador | `{ "ok": true, "message": "Hojas creadas o verificadas correctamente" }` | Navegador |
| 1.3 | Abrir Google Sheets | Existen exactamente 11 hojas: CONFIG_HABIT_GROUPS, CONFIG_HABITS, CONFIG_ACTIVITY_GROUPS, CONFIG_ACTIVITIES, CONFIG_DAY_TYPES, CONFIG_SCORE, APP_SETTINGS, DAILY_RECORDS, DAILY_HABIT_VALUES, ACTIVITY_LOG, CHANGE_LOG | Google Sheets |
| 1.4 | Verificar que la columna `date` de DAILY_RECORDS tiene formato texto | La celda A2 (si existe) muestra `2026-05-28`, no `28/05/2026` | Google Sheets → DAILY_RECORDS |
| 1.5 | Insertar al menos 1 fila en CONFIG_HABIT_GROUPS | Ver datos de ejemplo en `docs/DATA_MODEL.md` | Google Sheets |
| 1.6 | Insertar al menos 4 filas en CONFIG_HABITS (una por tipo: boolean, count, decimal, rating) | Ver datos de ejemplo en `docs/DATA_MODEL.md` | Google Sheets |
| 1.7 | Insertar al menos 1 fila en CONFIG_ACTIVITY_GROUPS | — | Google Sheets |
| 1.8 | Insertar al menos 2 filas en CONFIG_ACTIVITIES (una con requires_duration, otra sin) | — | Google Sheets |
| 1.9 | Insertar al menos 2 filas en CONFIG_DAY_TYPES | — | Google Sheets |

---

## 2. Carga desde Sheets

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 2.1 | Abrir la app (`npm run dev`) | La app carga sin errores en consola. SyncStatus muestra "Sincronizado" o "Actualizando…" | App + consola del navegador |
| 2.2 | Esperar 3–5 segundos tras abrir | SyncStatus pasa a "Sincronizado" con el dot verde | App |
| 2.3 | Abrir `?action=read_all` en el navegador | El JSON devuelve los datos recién insertados. Todos los campos `date` aparecen como `"YYYY-MM-DD"`, nunca como `"Sun May 24 2026..."` | Navegador |
| 2.4 | Comprobar que en la pestaña Hábitos se ven los grupos y hábitos insertados | Los grupos aparecen colapsables con sus hábitos dentro | App → Hábitos |
| 2.5 | Comprobar que en la pestaña Actividades se ven los grupos y actividades | — | App → Actividades |
| 2.6 | Si CONFIG_HABIT_GROUPS está vacío | Aparece el mensaje "No hay hábitos configurados en Google Sheets" | App → Hábitos |
| 2.7 | Si CONFIG_ACTIVITY_GROUPS está vacío | Aparece el mensaje "No hay actividades configuradas en Google Sheets" | App → Actividades |

---

## 3. Guardado de hábitos

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 3.1 | Marcar el hábito boolean como "Sí" | El botón se pone verde, el score del día sube | App → Hábitos |
| 3.2 | Volver a pulsar "Sí" | El botón vuelve a estado vacío (toggle off) | App |
| 3.3 | Aumentar el hábito count con el botón "+" | El número incrementa. Si supera el target, el status pasa a done | App |
| 3.4 | Editar el hábito decimal escribiendo un valor | El campo muestra el valor escrito | App |
| 3.5 | Seleccionar estrella en el hábito rating | Las estrellas se activan hasta la seleccionada | App |
| 3.6 | Comprobar que el score del día cambia en tiempo real | El número de score arriba varía conforme se marcan hábitos | App |
| 3.7 | Pulsar 💾 Guardar | El botón muestra "Guardando…" y luego "✓ Guardado". SyncStatus en verde | App |
| 3.8 | Comprobar DAILY_RECORDS en Sheets | Existe 1 fila para la fecha de hoy con los valores correctos en score_day, note, day_type_id | Google Sheets → DAILY_RECORDS |
| 3.9 | Comprobar DAILY_HABIT_VALUES en Sheets | Existe 1 fila por cada hábito con valor registrado para la fecha de hoy | Google Sheets → DAILY_HABIT_VALUES |
| 3.10 | Comprobar CHANGE_LOG | Existen entradas con `action = create` para DAILY_RECORDS y DAILY_HABIT_VALUES | Google Sheets → CHANGE_LOG |

---

## 4. Upsert de DAILY_RECORDS

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 4.1 | Sin cerrar la app, cambiar la nota del día y pulsar Guardar de nuevo | El botón vuelve a "✓ Guardado" | App |
| 4.2 | Comprobar DAILY_RECORDS en Sheets | Sigue habiendo **exactamente 1 fila** para la fecha de hoy. No se ha creado una segunda fila. `updated_at` ha cambiado | Google Sheets → DAILY_RECORDS |
| 4.3 | Repetir el guardado 3 veces más | El número de filas en DAILY_RECORDS para esa fecha sigue siendo 1 | Google Sheets → DAILY_RECORDS |
| 4.4 | Comprobar CHANGE_LOG | Las entradas adicionales tienen `action = update`, no `create` | Google Sheets → CHANGE_LOG |

---

## 5. Upsert de DAILY_HABIT_VALUES

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 5.1 | Cambiar el valor de un hábito ya guardado y pulsar Guardar | Guardado correcto | App |
| 5.2 | Comprobar DAILY_HABIT_VALUES en Sheets | Sigue habiendo **1 fila por cada combinación date+habit_id**. No hay duplicados | Google Sheets → DAILY_HABIT_VALUES |
| 5.3 | Comprobar que el campo `date` en DAILY_HABIT_VALUES es texto `YYYY-MM-DD` | La celda muestra `2026-05-28`, no `28/05/2026` ni `Sun May 28...` | Google Sheets → DAILY_HABIT_VALUES |
| 5.4 | Navegar a otro día y volver al día de hoy | Los valores se restauran correctamente desde el estado en memoria | App → Hábitos |
| 5.5 | Comprobar que al navegar a un día sin datos todos los hábitos aparecen vacíos | Sin valores prefill incorrectos | App |

---

## 6. Registro de actividades

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 6.1 | Ir a pestaña Actividades | Se ven los grupos y actividades configuradas | App → Actividades |
| 6.2 | Pulsar "+ Registrar" en una actividad con requires_duration = true | El formulario muestra el campo Duración con asterisco | App |
| 6.3 | Intentar guardar sin rellenar duración | Aparece error de validación: "La duración es obligatoria" | App |
| 6.4 | Rellenar duración y pulsar "Guardar sesión" | El formulario se cierra. Aparece "#1 · X min" en la lista de registros del día | App |
| 6.5 | Pulsar "+ Registrar" de nuevo en la misma actividad | Se puede registrar una segunda sesión | App |
| 6.6 | Guardar segunda sesión | Aparece "#2 · X min" en la lista | App |
| 6.7 | Comprobar ACTIVITY_LOG en Sheets | Existen 2 filas con el mismo `date` y `activity_id`, pero `activity_log_id` distintos | Google Sheets → ACTIVITY_LOG |
| 6.8 | Comprobar CHANGE_LOG | Ambas entradas tienen `action = create` | Google Sheets → CHANGE_LOG |
| 6.9 | Verificar que una actividad con requires_duration = false no muestra el campo Duración | El formulario no contiene input de duración | App |

---

## 7. Edición de actividades

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 7.1 | Pulsar "Editar" junto al registro "#1" | Se abre el formulario con los valores actuales precargados | App |
| 7.2 | Cambiar el valor de duración y pulsar "Guardar cambios" | La lista actualiza "#1" con el nuevo valor inmediatamente | App |
| 7.3 | Comprobar ACTIVITY_LOG en Sheets | Sigue habiendo la misma fila con el mismo `activity_log_id`. `updated_at` ha cambiado. `created_at` se conserva | Google Sheets → ACTIVITY_LOG |
| 7.4 | Comprobar CHANGE_LOG | La entrada de edición tiene `action = update` y `previous_value` con el valor anterior | Google Sheets → CHANGE_LOG |
| 7.5 | Si la actividad tenía un campo histórico con valor pero `requires_*` ahora es false | Al editar, el campo histórico aparece visible (sin asterisco de obligatorio) y editable | App |
| 7.6 | Guardar sin tocar el campo histórico | El valor original se conserva en Sheets, no se sobreescribe con vacío | Google Sheets → ACTIVITY_LOG |

---

## 8. No duplicado en ACTIVITY_LOG (idempotencia)

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 8.1 | Con la URL del Apps Script desconectada (cambiar VITE_APPS_SCRIPT_URL a URL inválida), intentar registrar una actividad | Aparece banner de error rojo. El registro no aparece en la lista | App |
| 8.2 | Restaurar la URL correcta y reintentar el mismo registro | Se envía el mismo `activity_log_id` generado antes del fallo | App |
| 8.3 | Comprobar ACTIVITY_LOG en Sheets | Solo existe 1 fila para ese `activity_log_id`. No hay duplicado | Google Sheets → ACTIVITY_LOG |
| 8.4 | Comprobar CHANGE_LOG | Existe 1 entrada `create`. No se creó un segundo `create` para el mismo ID | Google Sheets → CHANGE_LOG |

> **Nota:** Para simular el reintento manualmente, registrar una actividad, copiar el `activity_log_id` del log de Sheets, y enviarlo de nuevo con el mismo payload vía un cliente HTTP (ej. curl o Postman). El servidor debe devolver `ok: true` sin crear duplicado.

---

## 9. Evolución / heatmaps

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 9.1 | Ir a pestaña Evolución | Se muestra el heatmap global de score. Sin datos: cuadros en gris neutro | App → Evolución |
| 9.2 | Con datos de varios días, el heatmap muestra colores | Los colores varían según score_day. Hover sobre un cuadrado muestra tooltip con fecha y score | App |
| 9.3 | Si CONFIG_SCORE tiene reglas configuradas | Los colores del heatmap coinciden con los rangos definidos | App |
| 9.4 | Si CONFIG_SCORE está vacío | El heatmap usa el fallback: rojo suave (negativo), gris (0), verde suave, verde sólido | App |
| 9.5 | Pulsar tab interna "Hábitos" | Aparecen los bloques por grupo de hábitos | App |
| 9.6 | En un bloque de grupo, cambiar el selector de "Todos" a un hábito concreto | El heatmap de ese grupo cambia para mostrar solo el score de ese hábito. Los otros grupos no cambian | App |
| 9.7 | Pulsar tab interna "Actividades" | Aparecen los bloques por grupo de actividades | App |
| 9.8 | En un bloque de actividad, cambiar selector de "Todas" a una actividad concreta | El heatmap muestra solo los días con registros de esa actividad | App |
| 9.9 | Verificar que los días sin actividad aparecen en gris neutro | Sin coloreado falso en días vacíos | App |
| 9.10 | Los resúmenes bajo cada heatmap muestran datos coherentes | "días registrados", "media diaria" y "máx" coinciden con los datos en Sheets | App |

---

## 10. Validación de configuración (pestaña Sistema)

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 10.1 | Con configuración correcta, ir a pestaña Sistema | Aparece "✓ Configuración correcta" y el check verde | App → Sistema |
| 10.2 | En CONFIG_HABITS, duplicar una fila con el mismo `habit_id`. Recargar app | Sistema muestra error `H_DUPLICATE_ID` para esa hoja | App → Sistema |
| 10.3 | En CONFIG_HABITS, poner un `group_id` que no existe en CONFIG_HABIT_GROUPS. Recargar | Error `H_INVALID_GROUP` | App → Sistema |
| 10.4 | En CONFIG_ACTIVITIES, poner `target_unit = km` y `requires_distance = false`. Recargar | Warning `A_UNIT_DISTANCE_MISMATCH` | App → Sistema |
| 10.5 | En CONFIG_ACTIVITIES, poner `target_unit = min` y `requires_duration = false`. Recargar | Warning `A_UNIT_DURATION_MISMATCH` | App → Sistema |
| 10.6 | En CONFIG_SCORE, poner `min_value = 5` y `max_value = 3`. Recargar | Error `SR_INVALID_RANGE` | App → Sistema |
| 10.7 | En CONFIG_SCORE, crear dos reglas con rangos solapados para el mismo scope. Recargar | Warning `SR_OVERLAPPING_RANGES` | App → Sistema |
| 10.8 | Corregir todos los problemas en Sheets y recargar app | Sistema vuelve a mostrar "✓ Configuración correcta" | App → Sistema |
| 10.9 | Verificar que los errores en Sistema no bloquean el uso de Hábitos ni Actividades | Las otras pestañas siguen funcionando con normalidad | App |

---

## 11. Cambio directo en Sheets y recarga en app

Estas pruebas verifican que Google Sheets es la fuente maestra y que la app nunca impone sus datos locales.

| # | Acción | Resultado esperado | Verificar en |
|---|---|---|---|
| 11.1 | Modificar `score_day` de una fecha en DAILY_RECORDS directamente en Sheets. Recargar app | El heatmap global cambia de color para ese día | App → Evolución |
| 11.2 | Modificar `value` de un hábito en DAILY_HABIT_VALUES directamente en Sheets. Recargar app | Al navegar a esa fecha en Hábitos, el hábito muestra el valor de Sheets | App → Hábitos |
| 11.3 | Cambiar `name` de un hábito en CONFIG_HABITS. Recargar app | El hábito aparece con el nuevo nombre en la pantalla de Hábitos y en el selector de Evolución | App |
| 11.4 | Cambiar `active = false` en un hábito. Recargar app | El hábito desaparece de la pantalla de Hábitos. El histórico en Sheets se conserva | App |
| 11.5 | Añadir un tipo de día nuevo en CONFIG_DAY_TYPES. Recargar app | El nuevo tipo aparece en el selector "Tipo de día" de la pantalla de Hábitos | App → Hábitos |
| 11.6 | Abrir la app sin conexión a internet (con caché existente) | La app carga los datos de caché. SyncStatus muestra "Sin conexión con Sheets" | App |
| 11.7 | Restaurar la conexión y recargar | La app sincroniza. Aparece brevemente el aviso "↓ Datos actualizados desde Google Sheets" si los datos cambiaron | App |

---

## 12. Errores esperados y cómo resolverlos

| Síntoma | Causa probable | Solución |
|---|---|---|
| SyncStatus siempre en rojo "Sin conexión" | URL del Apps Script incorrecta o no desplegada | Verificar `VITE_APPS_SCRIPT_URL` en `.env`. Redesplegar Code.gs como nueva implementación |
| El POST de guardado falla con error CORS | Apps Script desplegado con acceso restringido | En Apps Script → Implementar → Gestionar implementaciones → editar → "Quién puede acceder": Cualquier persona |
| Los datos se duplican en DAILY_RECORDS | Se está ejecutando una versión antigua de Code.gs | Crear una **nueva implementación** en Apps Script (no editar la existente). Verificar con `?action=ping` que `version = "phase2-date-upsert-v3"` |
| `date` aparece como "Sun May 28..." en CHANGE_LOG | Entradas creadas con versión anterior de Code.gs | Las entradas históricas son irrecuperables. Las nuevas serán correctas. Ejecutar `?action=setup` para aplicar formato texto a las columnas de fecha |
| Hábito nunca puntúa aunque se cumple | `positive_rule` incompatible con el `type` del hábito | Revisar pestaña Sistema. Un tipo `count` con `positive_rule = yes_is_good` nunca puntúa. Cambiar a `greater_equal_target` |
| El score del día en la app no coincide con el de Sheets | `score_day` en Sheets fue modificado manualmente, pero la app muestra el recalculado en cliente | La app recalcula el score en cliente al interactuar. Al guardar, envía el score cliente a Sheets, sobreescribiendo el manual |
| Al editar una actividad aparece formulario vacío | El registro en memoria no tiene `activity_log_id` (registro muy antiguo o creado manualmente en Sheets) | Añadir manualmente un `activity_log_id` a la fila en Sheets con formato `log_YYYYMMDD_...` |
| Heatmap sin colores aunque hay datos | `score_day` está vacío en DAILY_RECORDS | Abrir el día en Hábitos, registrar algo y guardar. Esto recalcula y persiste el `score_day` |
| CONFIG_SCORE no aplica en el heatmap | `scope` de las reglas no es `day` | Verificar que la columna `scope` tiene el valor `day` (minúsculas) en CONFIG_SCORE |
| Actividad registrada no aparece en heatmap de Evolución | `date` en ACTIVITY_LOG está en formato incorrecto | Verificar que la columna `date` de ACTIVITY_LOG es texto `YYYY-MM-DD`. Ejecutar `?action=setup` para corregir el formato de la columna |
