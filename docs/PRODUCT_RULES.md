# PRODUCT_RULES.md

Reglas de producto de la app personal de hábitos. Estas reglas son **obligatorias** y no deben violarse en ninguna fase del desarrollo.

---

## Datos y sincronización

1. **Google Sheets es siempre la fuente maestra.** La app es una interfaz, no el sistema de verdad.
2. **Si hay diferencia entre datos locales y Google Sheets, siempre gana Google Sheets.**
3. La app puede usar caché local para abrir rápido, pero **nunca debe consolidar local por encima de Sheets.**
4. El guardado es **manual**, mediante un botón flotante siempre visible. No hay autoguardado silencioso.
5. Si Google Sheets reemplaza datos locales al sincronizar, la app debe **mostrar un aviso informativo**, no pedir decisión al usuario.
6. Es **inaceptable** perder datos, duplicar registros, perder configuración o romper la sincronización.
7. Debe existir un **log de cambios** en Google Sheets (hoja `CHANGE_LOG`).

---

## Configuración

8. Todo debe poder configurarse desde la app o directamente desde Google Sheets:
   - Hábitos, actividades, grupos
   - Tipos de día
   - Colores, descripciones, objetivos
   - Pesos del score
   - Orden visual, visibilidad, activación/desactivación

9. La configuración debe poder editarse tanto **desde la app** como **directamente desde Google Sheets**.

---

## Hábitos

10. Los hábitos **no se borran físicamente desde la app**. Se desactivan u ocultan para conservar histórico.
11. El borrado físico, si alguna vez se necesita, se hará directamente desde Google Sheets.
12. **Renombrar un hábito debe conservar histórico.** Para eso existen IDs técnicos estables.
13. **No hay hábitos obligatorios.** La app no debe generar presión innecesaria.
14. Los hábitos aplican a **todos los días**.
15. Puede existir estado "no aplica", pero en V1 puede dejarse preparado sin protagonismo.

---

## Registro diario

16. Debe existir un **campo libre de nota diaria**.
17. Debe existir un **tipo de día configurable**: rutina, enfermedad, viaje de trabajo, vacaciones, etc.

---

## Score

18. El score es **motivacional, no analítico crítico.**
19. El score debe ser **diario, semanal y mensual.**
20. El score **puede ser negativo.**
21. Cada hábito puede tener **peso cero** si no debe influir en el score.
22. La lógica del score debe vivir en **configuración** para poder calcularse igual en app y Google Sheets.

---

## Actividades

23. Las actividades son **distintas de los hábitos.**
24. Un **hábito** es una rutina diaria (se hace o no cada día).
25. Una **actividad** es algo que se registra por objetivos de periodo: semana, mes, trimestre, año.
26. Las actividades se agrupan por grupos.
27. Una actividad puede registrarse **varias veces el mismo día.**
28. Las actividades pueden tener **duración, distancia y comentario.**
29. La app debe **separar visualmente** hábitos y actividades.

---

## UX

30. La pantalla principal debe ser **directa para registrar hábitos** con el mínimo número de clics.
31. Debe haber una **vista de evolución con heatmap**: cada cuadrado representa un día.
32. En el heatmap, sin filtro, el color representa el **score general del día.**
33. En el heatmap, filtrando por hábito, el color representa el **score/cumplimiento de ese hábito.**
34. **No se necesitan exportaciones desde la app.** Todo eso se hará desde Google Sheets.

---

## Técnico

35. **Offline** sería deseable pero no obligatorio en V1 si complica demasiado.
36. **No hace falta login** en V1.
37. La V1 debe ser **simple, robusta y preparada para evolucionar.**

---

## Restricciones de V1 (no implementar todavía)

- Pantalla final de hábitos
- Pantalla final de actividades
- Configuración editable desde UI
- Heatmap
- Offline completo
- Login
- Analítica avanzada
- Exportaciones desde la app
