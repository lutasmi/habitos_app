# Hábitos — App personal de seguimiento

App personal de seguimiento de hábitos y actividades.  
Interfaz React → Google Apps Script → Google Sheets.

> **Google Sheets es siempre la fuente maestra.** La app es solo una interfaz rápida para registrar y consultar.

---

## Requisitos

- Node.js 18+
- Una cuenta de Google con acceso a Google Sheets y Google Apps Script

---

## Instalación y arranque local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno (ver sección "Configurar URL")
cp .env.example .env

# 3. Arrancar en local
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## Estructura del proyecto

```
habitos-app/
  docs/
    DATA_MODEL.md         ← Modelo de datos de Google Sheets
    PRODUCT_RULES.md      ← Reglas de producto obligatorias

  google-apps-script/
    Code.gs               ← Backend en Google Apps Script

  src/
    app/App.jsx           ← Pantalla principal
    components/common/    ← FloatingSaveButton, SyncStatus
    config/               ← Configuración y constantes
    domain/               ← Lógica de negocio (scoring, dates, habits, activities)
    services/             ← sheetsClient, localCache, syncService
    styles/               ← global.css
    main.jsx

  index.html
  package.json
  vite.config.js
```

---

## Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja en blanco.
2. Nómbrala como quieras (ej: "Hábitos 2024").
3. **No hace falta crear las hojas manualmente.** El setup automático las crea (ver abajo).

---

## Desplegar Code.gs en Google Apps Script

1. Abre el Google Sheet que creaste.
2. Ve a **Extensiones → Apps Script**.
3. Borra el contenido del editor y **pega todo el contenido** de `google-apps-script/Code.gs`.
4. Guarda el proyecto (Ctrl+S).
5. Haz clic en **Implementar → Nueva implementación**.
6. Configura:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: Cualquier persona *(o "Cualquier persona, incluso anónimas" si tienes problemas de CORS)*
7. Haz clic en **Implementar**.
8. Autoriza los permisos cuando se solicite.
9. **Copia la URL de la Web App** — la necesitarás en el siguiente paso.

> ⚠️ Cada vez que modifiques `Code.gs`, debes crear una **nueva implementación** (no reutilices la misma versión) para que los cambios tengan efecto.

---

## Configurar la URL del Apps Script en React

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_ID_AQUI/exec
```

Sustituye `TU_ID_AQUI` por la URL real que copiaste al desplegar.

Reinicia el servidor de desarrollo después de cambiar `.env`:

```bash
npm run dev
```

---

## Inicializar las hojas de Google Sheets

Una vez configurada la URL, desde la app:

1. Abre `http://localhost:5173`
2. Pulsa el botón **"🛠 Crear hojas (setup)"**
3. Verás la respuesta: `"Hojas creadas o verificadas correctamente"`
4. Abre tu Google Sheet — deberías ver todas las hojas creadas con sus cabeceras.

También puedes hacerlo directamente en el navegador:

```
https://script.google.com/macros/s/TU_ID/exec?action=setup
```

---

## Cómo probar la conexión completa

### 1. Ping
Desde la app, pulsa **"🔌 Probar conexión"**.  
Respuesta esperada:
```json
{ "ok": true, "data": { "pong": true }, "message": "Conexión correcta" }
```

O directamente en el navegador:
```
https://script.google.com/macros/s/TU_ID/exec?action=ping
```

### 2. Setup de hojas
Pulsa **"🛠 Crear hojas (setup)"** (o usa `?action=setup`).

### 3. Lectura completa
Pulsa **"📥 Leer datos"** (o usa `?action=read_all`).  
Verás el contenido de todas las hojas (vacías en un setup nuevo).

### 4. Guardado diario de prueba
1. Pulsa **"✏️ Simular cambio"** — el botón flotante se activará.
2. Pulsa **"💾 Guardar"** — se enviará un registro de prueba al día de hoy.
3. Verifica en Google Sheets → hoja `DAILY_RECORDS` que apareció una fila nueva.

### 5. Revisión del CHANGE_LOG
Abre Google Sheets → hoja `CHANGE_LOG`.  
Deberías ver un registro de cada operación realizada desde la app.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_APPS_SCRIPT_URL` | URL de la Web App desplegada en Google Apps Script |

---

## Documentación adicional

- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Modelo completo de Google Sheets
- [`docs/PRODUCT_RULES.md`](docs/PRODUCT_RULES.md) — Reglas de producto obligatorias

---

## Notas de sincronización

- **Sheets siempre gana.** Si hay diferencia entre datos locales y Sheets, Sheets tiene razón.
- El guardado es **siempre manual** (botón flotante). No hay autoguardado.
- Si el guardado falla, se muestra un error y los datos **no** se marcan como guardados.
- La app puede usar caché local para arrancar rápido, pero la reemplaza con Sheets al conectar.
