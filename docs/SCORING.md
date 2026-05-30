# Scoring y evolución de hábitos

Este documento explica cómo funciona el cálculo de puntuación de hábitos, cómo se guarda el resultado en Google Sheets y cómo se utiliza después en la pantalla de Evolución.

## 1. Principio general

La app separa dos conceptos:

| Concepto | Dónde se configura | Para qué sirve |
|---|---|---|
| Cálculo del score | `CONFIG_HABITS` | Determina cuánto suma o resta cada hábito |
| Color del heatmap | `CONFIG_SCORE` | Determina cómo se colorea un score ya calculado |

`CONFIG_HABITS` calcula puntos.  
`CONFIG_SCORE` solo pinta colores.

---

## 2. Cálculo de `score_value` por hábito

Cada hábito registrado en `DAILY_HABIT_VALUES` tiene un campo:

```txt
score_value
```

Ese valor se calcula a partir de la configuración del hábito en `CONFIG_HABITS`.

La lógica actual es binaria:

```txt
Si el hábito cumple la regla    → score_max
Si el hábito no cumple la regla → score_min
Si está vacío / no aplica       → 0
Si score_weight = 0             → 0
```

No hay cálculo proporcional en esta V1.  
Por ejemplo, en un hábito de fruta con objetivo 2 piezas:

```txt
0 piezas → score_min
1 pieza  → score_min
2 piezas → score_max
3 piezas → score_max
```

---

## 3. Columnas relevantes de `CONFIG_HABITS`

| Columna | Uso |
|---|---|
| `type` | Tipo de hábito: `boolean`, `count`, `decimal`, `rating` |
| `target_value` | Objetivo numérico cuando aplica |
| `positive_rule` | Regla que define cuándo el hábito se considera cumplido |
| `score_weight` | Peso base del hábito |
| `score_min` | Puntuación si el hábito no cumple |
| `score_max` | Puntuación si el hábito cumple |
| `active` | Si no está activo, no entra en el score diario |

---

## 4. Reglas de cumplimiento: `positive_rule`

### 4.1. Hábitos booleanos

Para hábitos de tipo:

```txt
type = boolean
```

Se usan principalmente estas reglas:

| `positive_rule` | Significado |
|---|---|
| `yes_is_good` | Marcar “Sí” es positivo |
| `no_is_good` | Marcar “No” es positivo |

Ejemplos:

| Hábito | Regla | Valor | Resultado |
|---|---|---|---|
| Medicación | `yes_is_good` | Sí | Cumple |
| Medicación | `yes_is_good` | No | No cumple |
| Coca-Cola | `no_is_good` | No | Cumple |
| Coca-Cola | `no_is_good` | Sí | No cumple |

---

### 4.2. Hábitos numéricos

Para hábitos de tipo:

```txt
count
decimal
rating
```

Se usan reglas de comparación contra `target_value`:

| `positive_rule` | Significado |
|---|---|
| `greater_equal_target` | Cumple si `value >= target_value` |
| `lower_equal_target` | Cumple si `value <= target_value` |

Ejemplos:

| Hábito | Objetivo | Regla | Valor | Resultado |
|---|---:|---|---:|---|
| Fruta | 2 | `greater_equal_target` | 1 | No cumple |
| Fruta | 2 | `greater_equal_target` | 2 | Cumple |
| Café máximo | 2 | `lower_equal_target` | 3 | No cumple |
| Café máximo | 2 | `lower_equal_target` | 1 | Cumple |

---

## 5. Cómo se aplican `score_min`, `score_max` y `score_weight`

La regla definitiva es:

```txt
score_weight = 0 → el hábito no puntúa
score_max informado → usar score_max
score_max vacío → usar score_weight
score_max = 0 → usar 0

score_min informado → usar score_min
score_min vacío → usar 0
score_min = 0 → usar 0
```

Esto permite configurar tanto hábitos positivos como negativos.

---

## 6. Ejemplos prácticos

### 6.1. Medicación

Configuración:

| Campo | Valor |
|---|---|
| `type` | `boolean` |
| `positive_rule` | `yes_is_good` |
| `score_weight` | `2` |
| `score_min` | `-4` |
| `score_max` | `2` |

Resultado:

| Registro | Score |
|---|---:|
| Sí | `+2` |
| No | `-4` |
| Vacío | `0` |

---

### 6.2. Fruta

Configuración:

| Campo | Valor |
|---|---|
| `type` | `count` |
| `target_value` | `2` |
| `positive_rule` | `greater_equal_target` |
| `score_weight` | `1` |
| `score_min` | `0` |
| `score_max` | vacío |

Como `score_max` está vacío, se usa `score_weight`.

Resultado:

| Registro | Score |
|---|---:|
| 0 piezas | `0` |
| 1 pieza | `0` |
| 2 piezas | `+1` |
| 3 piezas | `+1` |

---

### 6.3. Coca-Cola

Configuración:

| Campo | Valor |
|---|---|
| `type` | `boolean` |
| `positive_rule` | `no_is_good` |
| `score_weight` | `1` |
| `score_min` | `-3` |
| `score_max` | `1` |

Resultado:

| Registro | Score |
|---|---:|
| No Coca-Cola | `+1` |
| Sí Coca-Cola | `-3` |
| Vacío | `0` |

---

## 7. Cálculo de `score_day`

El score diario se calcula sumando los `score_value` de los hábitos activos del día:

```txt
score_day = suma(score_value de los hábitos activos)
```

Ejemplo:

| Hábito | Score |
|---|---:|
| Medicación | `+2` |
| Fruta | `+1` |
| Coca-Cola | `-3` |

Resultado:

```txt
score_day = 0
```

Ese valor se guarda en:

```txt
DAILY_RECORDS.score_day
```

El heatmap global usa el valor guardado en Google Sheets, no recalcula el histórico automáticamente.

---

## 8. Impacto de cambiar la configuración

Si se cambia `score_min`, `score_max`, `score_weight` o `positive_rule`, la nueva lógica aplica a los próximos guardados.

El histórico ya guardado en `DAILY_RECORDS.score_day` y `DAILY_HABIT_VALUES.score_value` no se recalcula automáticamente.

Esto es intencionado en V1 porque Google Sheets es la fuente maestra y el histórico debe conservar lo que se calculó en su momento.

Si se quiere recalcular histórico, debe hacerse de forma explícita en Google Sheets o mediante una futura función de recalculado.

---

## 9. `CONFIG_SCORE`: colores del heatmap

`CONFIG_SCORE` no cambia los puntos. Solo traduce un score a un color.

Columnas relevantes:

| Columna | Uso |
|---|---|
| `scope` | Ámbito de la regla. Para score diario se usa `day` |
| `min_value` | Límite inferior del rango |
| `max_value` | Límite superior del rango |
| `color` | Color que se aplica |
| `label` | Texto descriptivo |
| `sort_order` | Prioridad de la regla |
| `active` | Si está activo o no |

La lógica usa rangos:

```txt
min_value <= score < max_value
```

Si hay rangos solapados, gana la regla con menor `sort_order`.

Ejemplo:

| scope | min_value | max_value | color | label | sort_order |
|---|---:|---:|---|---|---:|
| day | -99 | 0 | `#fca5a5` | Bajo | 1 |
| day | 0 | 1 | `#d1d5db` | Neutro | 2 |
| day | 1 | 4 | `#86efac` | Bien | 3 |
| day | 4 | 99 | `#16a34a` | Muy bien | 4 |

---

## 10. Heatmaps en Evolución

### 10.1. Heatmap global

Usa:

```txt
DAILY_RECORDS.score_day
```

Representa el resultado total del día.

---

### 10.2. Heatmap de grupos de hábitos

Para cada grupo de hábitos:

```txt
CONFIG_HABIT_GROUPS
```

El modo “Todos” suma los `score_value` de todos los hábitos del grupo para ese día.

Si se filtra por un hábito concreto, usa solo el `score_value` de ese hábito.

---

### 10.3. Heatmap de actividades

Las actividades no usan score en V1.

Para actividades, el heatmap representa:

```txt
número de registros
```

- Modo “Todas”: número de registros del grupo de actividades en ese día.
- Modo actividad concreta: número de registros de esa actividad en ese día.

No se usan todavía duración, distancia ni `target_unit` para colorear el heatmap de actividades.

---

## 11. Reglas de mantenimiento

Para evitar errores:

1. No usar `parseFloat(valor) || fallback` en scoring.
2. Usar una función que distinga entre:
   - campo vacío
   - número válido
   - cero válido
3. Respetar siempre `score_min = 0` y `score_max = 0`.
4. Mantener `CONFIG_HABITS` como fuente de cálculo.
5. Mantener `CONFIG_SCORE` como fuente de color.
6. No recalcular histórico automáticamente sin una acción explícita.
