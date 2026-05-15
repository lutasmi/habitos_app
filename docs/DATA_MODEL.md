# DATA_MODEL.md

Modelo de datos de la app de hábitos. Google Sheets es siempre la fuente maestra.

---

## Reglas globales

### IDs estables
Todos los registros de configuración tienen un `*_id` técnico (ej: `habit_id`, `activity_id`).  
Este ID **nunca cambia**, incluso si se renombra el hábito o actividad.  
Esto garantiza que el histórico siempre se asocia correctamente al elemento correcto.

Formato recomendado: `hab_001`, `act_001`, `grp_001`, `dtyp_001`, etc.

### Borrado lógico
Los hábitos y actividades **nunca se borran físicamente desde la app**.  
Se marcan como `active: false` o `visible: false`.  
El borrado físico, si alguna vez es necesario, se hace directamente en Google Sheets.

### Timestamps
Todas las hojas de configuración y registros llevan `created_at` y `updated_at` en formato ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`).

### `updated_by`
Indica el origen del cambio: `"app"` o `"sheets"`. Útil para auditoría y debug de sincronización.

---

## Hojas de Google Sheets

---

### CONFIG_HABIT_GROUPS

Agrupa hábitos para mostrarlos visualmente agrupados en la pantalla principal.

| Columna | Tipo | Descripción |
|---|---|---|
| group_id | string | ID estable único. Ej: `grp_h_001` |
| name | string | Nombre del grupo. Ej: "Salud" |
| emoji | string | Emoji representativo. Ej: "💪" |
| color | string | Color HEX. Ej: `#4CAF50` |
| sort_order | number | Orden visual en pantalla |
| open_by_default | boolean | Si el grupo aparece expandido al abrir la app |
| active | boolean | Si el grupo está activo |
| visible | boolean | Si se muestra en la app |
| created_at | ISO date | Fecha de creación |
| updated_at | ISO date | Fecha de última modificación |

---

### CONFIG_HABITS

Definición de cada hábito. Cada hábito pertenece a un grupo.

| Columna | Tipo | Descripción |
|---|---|---|
| habit_id | string | ID estable único. Ej: `hab_001` |
| group_id | string | FK → CONFIG_HABIT_GROUPS.group_id |
| name | string | Nombre visible. Ej: "Dormir 8h" |
| description | string | Descripción o ayuda opcional |
| type | enum | `boolean` \| `count` \| `decimal` \| `rating` |
| target_value | number | Valor objetivo. Ej: 8 (horas) |
| unit | string | Unidad visual. Ej: "horas", "vasos", "km" |
| positive_rule | enum | Ver reglas válidas abajo |
| score_weight | number | Peso en el score total. 0 = no influye |
| score_min | number | Score mínimo que puede aportar este hábito |
| score_max | number | Score máximo que puede aportar este hábito |
| color | string | Color HEX propio del hábito (override del grupo) |
| sort_order | number | Orden visual dentro del grupo |
| active | boolean | Si está activo |
| visible | boolean | Si se muestra en la app |
| created_at | ISO date | Fecha de creación |
| updated_at | ISO date | Fecha de última modificación |

**Tipos válidos (`type`)**
- `boolean` — sí/no
- `count` — número entero (vasos de agua, series, etc.)
- `decimal` — número decimal (horas de sueño, km, etc.)
- `rating` — valoración (1–5, 1–10, etc.)

**Reglas válidas (`positive_rule`)**
- `yes_is_good` — para boolean: marcar como hecho es positivo
- `no_is_good` — para boolean: NO hacerlo es positivo (ej: "Sin alcohol")
- `greater_equal_target` — bueno si valor >= target_value
- `lower_equal_target` — bueno si valor <= target_value

---

### CONFIG_ACTIVITY_GROUPS

Agrupa actividades físicas o de otro tipo.

| Columna | Tipo | Descripción |
|---|---|---|
| group_id | string | ID estable único. Ej: `grp_a_001` |
| name | string | Nombre del grupo. Ej: "Deporte" |
| emoji | string | Emoji representativo |
| color | string | Color HEX |
| sort_order | number | Orden visual |
| active | boolean | Si está activo |
| visible | boolean | Si se muestra |
| created_at | ISO date | Fecha de creación |
| updated_at | ISO date | Fecha de última modificación |

---

### CONFIG_ACTIVITIES

Definición de cada actividad registrable.

| Columna | Tipo | Descripción |
|---|---|---|
| activity_id | string | ID estable único. Ej: `act_001` |
| group_id | string | FK → CONFIG_ACTIVITY_GROUPS.group_id |
| name | string | Nombre. Ej: "Correr" |
| description | string | Descripción opcional |
| target_value | number | Objetivo del periodo. Ej: 3 |
| target_period | enum | `week` \| `month` \| `quarter` \| `year` |
| target_unit | string | Unidad del objetivo. Ej: "sesiones", "km" |
| requires_duration | boolean | Si se registra duración en minutos |
| requires_distance | boolean | Si se registra distancia en km |
| requires_comment | boolean | Si se solicita comentario al registrar |
| color | string | Color HEX |
| sort_order | number | Orden visual dentro del grupo |
| active | boolean | Si está activo |
| visible | boolean | Si se muestra |
| created_at | ISO date | Fecha de creación |
| updated_at | ISO date | Fecha de última modificación |

---

### CONFIG_DAY_TYPES

Tipos de día que el usuario puede asignar a cada jornada.

| Columna | Tipo | Descripción |
|---|---|---|
| day_type_id | string | ID estable. Ej: `dtyp_001` |
| name | string | Nombre. Ej: "Rutina", "Viaje", "Enfermedad" |
| emoji | string | Emoji representativo |
| color | string | Color HEX |
| sort_order | number | Orden visual |
| active | boolean | Si está activo |
| visible | boolean | Si se muestra |

---

### CONFIG_SCORE

Define rangos de score y su apariencia visual (color, etiqueta).

| Columna | Tipo | Descripción |
|---|---|---|
| rule_id | string | ID. Ej: `score_001` |
| scope | enum | `day` \| `week` \| `month` |
| min_value | number | Límite inferior del rango (inclusive) |
| max_value | number | Límite superior del rango (exclusive) |
| color | string | Color HEX para ese rango |
| label | string | Etiqueta. Ej: "Excelente", "Mejorable" |
| sort_order | number | Orden |
| active | boolean | Si está activo |

El score puede ser negativo. Los rangos deben cubrirlo.  
La lógica de cálculo del score vive en `src/domain/scoring.js` y debe poder replicarse en Sheets.

---

### APP_SETTINGS

Configuración general de la app en formato clave–valor.

| Columna | Tipo | Descripción |
|---|---|---|
| setting_key | string | Clave única. Ej: `app_name`, `default_day_type` |
| setting_value | string | Valor (siempre string, parsear según tipo) |
| description | string | Descripción del setting |
| updated_at | ISO date | Última modificación |

---

### DAILY_RECORDS

Una fila por día. Registra el contexto general del día.

| Columna | Tipo | Descripción |
|---|---|---|
| date | string | Fecha en formato `YYYY-MM-DD` (clave primaria) |
| day_type_id | string | FK → CONFIG_DAY_TYPES.day_type_id |
| note | string | Nota libre del día |
| score_day | number | Score calculado del día |
| score_week | number | Score calculado de la semana |
| score_month | number | Score calculado del mes |
| updated_at | ISO date | Última modificación |
| updated_by | string | `"app"` o `"sheets"` |

---

### DAILY_HABIT_VALUES

Una fila por combinación `date + habit_id`. Registra el valor de cada hábito cada día.

| Columna | Tipo | Descripción |
|---|---|---|
| date | string | `YYYY-MM-DD` |
| habit_id | string | FK → CONFIG_HABITS.habit_id |
| value | string | Valor registrado (siempre string, parsear según tipo del hábito) |
| status | enum | `empty` \| `done` \| `not_done` \| `not_applicable` |
| score_value | number | Score aportado por este hábito ese día |
| updated_at | ISO date | Última modificación |
| updated_by | string | `"app"` o `"sheets"` |

**Estados válidos (`status`)**
- `empty` — no registrado todavía
- `done` — completado / positivo
- `not_done` — no completado / negativo
- `not_applicable` — no aplica ese día (viaje, enfermedad, etc.)

---

### ACTIVITY_LOG

Una fila por cada registro de actividad. Una actividad puede registrarse varias veces el mismo día.

| Columna | Tipo | Descripción |
|---|---|---|
| activity_log_id | string | ID único del registro. Ej: `log_20240115_001` |
| date | string | `YYYY-MM-DD` |
| activity_id | string | FK → CONFIG_ACTIVITIES.activity_id |
| duration_min | number | Duración en minutos (opcional) |
| distance_km | number | Distancia en km (opcional) |
| comment | string | Comentario libre (opcional) |
| created_at | ISO date | Fecha de creación |
| updated_at | ISO date | Fecha de última modificación |
| updated_by | string | `"app"` o `"sheets"` |

---

### CHANGE_LOG

Registro de auditoría de todos los cambios realizados en la app o en Sheets.

| Columna | Tipo | Descripción |
|---|---|---|
| change_id | string | ID único. Ej: `chg_001` |
| timestamp | ISO date | Momento del cambio |
| sheet_name | string | Hoja afectada |
| entity_id | string | ID del registro afectado |
| action | enum | `create` \| `update` \| `deactivate` |
| previous_value | JSON string | Valor anterior (puede ser objeto serializado) |
| new_value | JSON string | Valor nuevo |
| source | string | `"app"` o `"sheets"` |
| user | string | Identificador del usuario (si aplica) |

---

## Notas de sincronización

1. Al abrir la app se puede usar caché local para velocidad.
2. Después se consulta Google Sheets. Si responde, **Sheets gana siempre**.
3. Al guardar (botón manual), la app envía a Sheets y reemplaza su estado local por la respuesta oficial.
4. Si Sheets reemplaza datos locales, la app muestra aviso informativo (no pide decisión).
5. Si el guardado falla, se muestra error visible y **no** se marca como guardado.
