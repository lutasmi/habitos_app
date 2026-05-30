# Guía de usuario

App personal de seguimiento de hábitos y actividades.

---

## Índice

1. [Cómo funciona la app](#cómo-funciona-la-app)
2. [Configurar grupos de hábitos](#configurar-grupos-de-hábitos)
3. [Configurar hábitos](#configurar-hábitos)
4. [Configurar actividades](#configurar-actividades)
5. [Registrar hábitos del día](#registrar-hábitos-del-día)
6. [Registrar actividades](#registrar-actividades)
7. [Editar un registro de actividad](#editar-un-registro-de-actividad)
8. [Interpretar la pantalla Evolución](#interpretar-la-pantalla-evolución)
9. [Interpretar la pantalla Sistema](#interpretar-la-pantalla-sistema)
10. [Google Sheets manda siempre](#google-sheets-manda-siempre)

---

## Cómo funciona la app

La app tiene cuatro pestañas en la barra inferior:

| Pestaña | Para qué sirve |
|---|---|
| **✓ Hábitos** | Registrar los hábitos del día |
| **⚡ Actividades** | Registrar sesiones de actividades |
| **◼ Evolución** | Ver el historial visual (heatmaps) |
| **⚙ Sistema** | Comprobar si la configuración en Sheets tiene errores |

**Google Sheets es siempre la fuente de datos.** La app es una interfaz rápida para registrar y consultar. Toda la configuración se gestiona desde Sheets.

---

## Configurar grupos de hábitos

Los hábitos se organizan en grupos (por ejemplo: Salud, Productividad, Bienestar). Cada grupo aparece como un bloque colapsable en la pantalla de Hábitos.

**Dónde:** Google Sheets → hoja `CONFIG_HABIT_GROUPS`

**Columnas que debes rellenar:**

| Columna | Obligatorio | Descripción |
|---|---|---|
| `group_id` | ✅ | Identificador único y estable. Ej: `grp_h_001`. Nunca cambiar una vez creado |
| `name` | ✅ | Nombre visible en la app. Ej: `Salud` |
| `emoji` | — | Emoji que aparece delante del nombre. Ej: `💪` |
| `color` | — | Color HEX del grupo. Ej: `#16a34a` |
| `sort_order` | — | Número para ordenar los grupos. El menor aparece primero |
| `open_by_default` | — | `true` si el grupo debe aparecer expandido al abrir la app |
| `active` | ✅ | `true` para que aparezca en la app |
| `visible` | ✅ | `true` para que sea visible |
| `created_at` / `updated_at` | — | Fechas de auditoría en formato `YYYY-MM-DD` |

**Ejemplo:**

| group_id | name | emoji | sort_order | active | visible |
|---|---|---|---|---|---|
| grp_h_001 | Salud | 💪 | 1 | true | true |
| grp_h_002 | Productividad | 🧠 | 2 | true | true |

> **Tip:** Los grupos no se borran. Si ya no quieres usar uno, pon `active = false` o `visible = false`.

---

## Configurar hábitos

Cada hábito pertenece a un grupo y tiene un tipo que determina cómo se registra.

**Dónde:** Google Sheets → hoja `CONFIG_HABITS`

### Columnas principales

| Columna | Obligatorio | Descripción |
|---|---|---|
| `habit_id` | ✅ | ID único y estable. Ej: `hab_001`. Nunca cambiar |
| `group_id` | ✅ | Debe coincidir con un `group_id` de `CONFIG_HABIT_GROUPS` |
| `name` | ✅ | Nombre visible. Ej: `Dormir 8h` |
| `description` | — | Texto de ayuda opcional que aparece debajo del nombre |
| `type` | ✅ | Tipo del hábito (ver abajo) |
| `target_value` | — | Valor objetivo para tipos numéricos |
| `unit` | — | Unidad visual. Ej: `horas`, `vasos` |
| `positive_rule` | ✅ | Qué cuenta como cumplido (ver abajo) |
| `score_weight` | — | Si es `0` o está vacío, el hábito no puntúa en el score |
| `score_min` | — | Puntos que aporta si **no** se cumple (puede ser negativo) |
| `score_max` | — | Puntos que aporta si se cumple. Si está vacío, usa `score_weight` |
| `sort_order` | — | Orden dentro del grupo |
| `active` | ✅ | `true` para que aparezca |
| `visible` | ✅ | `true` para que sea visible |

### Tipos de hábito (`type`)

| Tipo | Cómo se registra | Ejemplo |
|---|---|---|
| `boolean` | Botón Sí / No | "¿Has bebido agua?" |
| `count` | Contador con + y − | "Vasos de agua bebidos" |
| `decimal` | Campo numérico con decimales | "Horas de sueño" |
| `rating` | Estrellas del 1 al N | "Nivel de energía (1–5)" |

### Reglas positivas (`positive_rule`)

Define cuándo el hábito se considera **cumplido**:

| Regla | Cuándo usar | Lógica |
|---|---|---|
| `yes_is_good` | Boolean: marcar como Sí es positivo | "Medité hoy" → Sí = cumplido |
| `no_is_good` | Boolean: NO marcar es positivo | "Sin alcohol" → No = cumplido |
| `greater_equal_target` | Numérico: bueno si valor ≥ objetivo | "Vasos de agua ≥ 8" |
| `lower_equal_target` | Numérico: bueno si valor ≤ objetivo | "Tiempo en pantalla ≤ 2h" |

> **Regla de compatibilidad:** usa `yes_is_good` o `no_is_good` solo con `type = boolean`. Usa `greater_equal_target` o `lower_equal_target` con `count`, `decimal` o `rating`. Combinaciones incorrectas generarán un aviso en la pestaña **Sistema**.

### Cómo renombrar un hábito

Cambia directamente la columna `name` en Sheets. El `habit_id` no cambia, por lo que el histórico se conserva íntegramente.

### Cómo desactivar un hábito

Pon `active = false` en Sheets. El hábito desaparecerá de la app pero sus datos históricos permanecen intactos. No borres la fila.

---

## Configurar actividades

Las actividades son distintas de los hábitos: no son rutinas diarias, sino cosas que se registran por objetivos de periodo (semana, mes, trimestre, año). Se pueden registrar varias veces en el mismo día.

### Paso 1: Crear un grupo de actividades

**Dónde:** Google Sheets → hoja `CONFIG_ACTIVITY_GROUPS`

| Columna | Obligatorio | Descripción |
|---|---|---|
| `group_id` | ✅ | ID único. Ej: `grp_a_001` |
| `name` | ✅ | Nombre del grupo. Ej: `Deporte` |
| `emoji` | — | Emoji representativo |
| `sort_order` | — | Orden visual |
| `active` / `visible` | ✅ | `true` para que aparezca |

### Paso 2: Crear las actividades

**Dónde:** Google Sheets → hoja `CONFIG_ACTIVITIES`

| Columna | Obligatorio | Descripción |
|---|---|---|
| `activity_id` | ✅ | ID único. Ej: `act_001` |
| `group_id` | ✅ | Debe coincidir con un `group_id` de `CONFIG_ACTIVITY_GROUPS` |
| `name` | ✅ | Nombre. Ej: `Correr` |
| `target_value` | — | Objetivo del periodo. Ej: `3` |
| `target_period` | — | `week`, `month`, `quarter` o `year` |
| `target_unit` | — | `sesiones`, `km`, `min` |
| `requires_duration` | — | `true` si se debe registrar la duración en minutos |
| `requires_distance` | — | `true` si se debe registrar la distancia en km |
| `requires_comment` | — | `true` si se debe escribir un comentario al registrar |
| `sort_order` | — | Orden dentro del grupo |
| `active` / `visible` | ✅ | `true` para que aparezca |

> **Consistencia:** si `target_unit = km`, activa también `requires_distance = true`. Si `target_unit = min`, activa `requires_duration = true`. Si no lo haces, la pantalla **Sistema** mostrará un aviso.

---

## Registrar hábitos del día

1. Abre la pestaña **✓ Hábitos**.
2. La fecha por defecto es hoy. Usa los botones **‹** y **›** para navegar a otro día.
3. Elige el **tipo de día** (Rutina, Viaje, Enfermedad…) en el selector si lo tienes configurado.
4. Escribe una **nota libre** si quieres apuntar algo del día.
5. Registra cada hábito según su tipo:
   - **Boolean:** pulsa **✓ Sí** o **✗ No**. Pulsa de nuevo para deseleccionar.
   - **Count:** usa **−** y **+** o escribe el número directamente.
   - **Decimal:** escribe el valor en el campo.
   - **Rating:** pulsa la estrella correspondiente.
6. El **score del día** se actualiza en tiempo real conforme marcas hábitos.
7. Pulsa **💾 Guardar** para enviar los datos a Google Sheets.

> El guardado es **siempre manual**. La app no guarda automáticamente. Si cierras sin guardar, los cambios se perderán.

**Si el guardado falla:** aparece un banner rojo con el error. El botón sigue activo. Corrige el problema (conexión, URL) y vuelve a pulsar Guardar.

---

## Registrar actividades

1. Abre la pestaña **⚡ Actividades**.
2. Selecciona la fecha si no es hoy.
3. Localiza la actividad en su grupo.
4. Pulsa **+ Registrar**.
5. Rellena los campos que aparezcan (duración, distancia, comentario). Los campos marcados con **\*** son obligatorios según la configuración.
6. Pulsa **Guardar sesión**.

La sesión aparece en la lista como **#1**, **#2**, etc. Puedes registrar la misma actividad varias veces en el mismo día.

La **barra de progreso** bajo el nombre de la actividad muestra el avance hacia el objetivo del periodo actual (semana, mes, etc.).

---

## Editar un registro de actividad

1. En la lista de registros del día, pulsa **Editar** junto al registro que quieras modificar.
2. El formulario se abre con los valores actuales precargados.
3. Modifica los campos que necesites y pulsa **Guardar cambios**.

> Editar **no crea una fila nueva** en Google Sheets. Actualiza la fila existente conservando el mismo identificador (`activity_log_id`) y la fecha de creación original (`created_at`).

---

## Interpretar la pantalla Evolución

La pantalla **◼ Evolución** muestra tu historial en los últimos 90 días mediante heatmaps: cuadrículas donde cada cuadrado es un día y el color indica el nivel de actividad o cumplimiento.

### Heatmap global (siempre visible)

Muestra el **score total del día** almacenado en `DAILY_RECORDS`. El color sigue las reglas de `CONFIG_SCORE` si las tienes configuradas; si no, usa una escala de cuatro niveles:

| Color | Significado |
|---|---|
| Gris neutro | Sin registro ese día |
| Rojo suave | Score negativo |
| Gris medio | Score cero |
| Verde suave | Score positivo bajo |
| Verde sólido | Score positivo alto |

Pasa el dedo (o el cursor) sobre un cuadrado para ver la fecha y el score exacto.

### Tab interna: Hábitos

Un heatmap por cada grupo activo de hábitos. Cada bloque tiene un selector:

- **Todos:** el color representa la suma del score de todos los hábitos del grupo ese día.
- **Hábito concreto:** el color representa el score de ese hábito únicamente.

### Tab interna: Actividades

Un heatmap por cada grupo de actividades. El color indica **cuántas sesiones** se registraron ese día para el grupo o la actividad seleccionada:

| Color | Sesiones |
|---|---|
| Gris | Sin registro |
| Verde suave | 1 sesión |
| Verde sólido | 2 o más sesiones |

### Resumen estadístico

Bajo cada heatmap aparece un resumen con días registrados, media diaria y el día máximo. El resumen solo tiene en cuenta los días con datos.

---

## Interpretar la pantalla Sistema

La pestaña **⚙ Sistema** valida automáticamente la configuración cargada desde Google Sheets y te avisa si algo está mal.

### Estados posibles

| Indicador | Significado |
|---|---|
| ✓ Sin problemas | La configuración es correcta |
| ✕ N errores | Hay problemas que pueden romper el comportamiento de la app |
| ! N avisos | Hay inconsistencias que no rompen la app pero pueden dar resultados inesperados |

### Diferencia entre error y aviso

- **Error:** algo que definitivamente fallará o producirá datos incorrectos. Ejemplo: un `habit_id` duplicado, un `group_id` que no existe, un rango de score donde `min_value ≥ max_value`.
- **Aviso:** una configuración que probablemente no es lo que quieres. Ejemplo: una actividad con `target_unit = km` pero `requires_distance = false` (la distancia nunca se registrará).

### Cómo resolver un problema

1. Lee el mensaje y el ID del registro afectado.
2. Ve a la hoja indicada en Google Sheets.
3. Corrige el valor.
4. Vuelve a la app y recárgala (F5 o cerrar y abrir).
5. Comprueba que el error desaparece en Sistema.

> **La pantalla Sistema no bloquea el uso de la app.** Puedes seguir registrando hábitos y actividades aunque haya errores. Los errores solo afectan a los elementos mal configurados, no a toda la app.

---

## Google Sheets manda siempre

Esta es la regla más importante de la app.

**Google Sheets es la fuente de datos oficial.** La app es una interfaz rápida para registrar y consultar, pero nunca tiene más autoridad que Sheets.

### Qué significa en la práctica

- **Al abrir la app:** puede mostrar datos de caché local para que cargue rápido, pero enseguida consulta Sheets. Cuando Sheets responde, sus datos reemplazan los locales. Si ves el aviso "↓ Datos actualizados desde Google Sheets", es normal: significa que Sheets tenía datos más recientes que la caché.

- **Al guardar:** la app envía los datos a Sheets y espera confirmación. Solo marca como guardado cuando Sheets lo confirma. Si falla, los cambios permanecen pendientes y el botón 💾 sigue activo.

- **Si modificas Sheets directamente:** esos cambios serán los oficiales la próxima vez que recargues la app. Puedes hacer análisis avanzados, corregir errores, borrar registros o cambiar configuración directamente desde Sheets.

### Lo que puedes hacer directamente en Sheets

| Acción | Cómo |
|---|---|
| Renombrar un hábito | Cambiar la columna `name` en `CONFIG_HABITS` |
| Desactivar un hábito | Poner `active = false` en `CONFIG_HABITS` |
| Borrar un registro incorrecto | Eliminar la fila en `DAILY_RECORDS`, `DAILY_HABIT_VALUES` o `ACTIVITY_LOG` |
| Corregir un valor histórico | Editar directamente la celda correspondiente |
| Hacer análisis avanzados | Usar fórmulas, gráficos o tablas dinámicas sobre las hojas de datos |
| Exportar datos | Descargar como CSV o conectar con otras herramientas |

### Lo que no debes hacer en Sheets

| Acción | Por qué evitarla |
|---|---|
| Cambiar un `habit_id` o `activity_id` | Rompe la asociación con todos los registros históricos de ese ID |
| Eliminar una fila de configuración con histórico | Pierde el vínculo entre los registros y la definición del hábito |
| Cambiar el formato de la columna `date` a tipo Fecha | Puede romper el upsert. La columna debe ser texto en formato `YYYY-MM-DD` |
| Borrar la hoja `CHANGE_LOG` | Pierdes el historial de auditoría |
