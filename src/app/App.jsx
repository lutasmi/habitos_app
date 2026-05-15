/**
 * App.jsx
 *
 * Pantalla mínima de fase 1: verificación de conexión, lectura y escritura.
 * NO es la pantalla final de hábitos. Solo sirve para probar la base técnica.
 */

import { useState } from 'react';
import { FloatingSaveButton } from '../components/common/FloatingSaveButton.jsx';
import { SyncStatus } from '../components/common/SyncStatus.jsx';
import * as sheetsClient from '../services/sheetsClient.js';
import { todayString } from '../domain/dates.js';
import { getLastSyncTime } from '../services/localCache.js';

export default function App() {
  const [syncStatus, setSyncStatus] = useState('checking');
  const [syncMessage, setSyncMessage] = useState('Sin verificar');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Handlers ----

  async function handlePing() {
    setLoading(true);
    setSyncStatus('checking');
    setSyncMessage('Verificando conexión…');
    const result = await sheetsClient.ping();
    setResponse(result);
    if (result.ok) {
      setSyncStatus('ok');
      setSyncMessage('Conectado');
    } else {
      setSyncStatus('error');
      setSyncMessage(result.error || 'Sin conexión');
    }
    setLoading(false);
  }

  async function handleSetup() {
    setLoading(true);
    setResponse(null);
    const result = await sheetsClient.setupSheets();
    setResponse(result);
    setLoading(false);
  }

  async function handleReadAll() {
    setLoading(true);
    setResponse(null);
    const result = await sheetsClient.readAll();
    setResponse(result);
    if (result.ok) {
      setSyncStatus('ok');
      setSyncMessage('Datos leídos correctamente');
    } else {
      setSyncStatus('error');
      setSyncMessage(result.error || 'Error al leer');
    }
    setLoading(false);
  }

  function handleMarkChanges() {
    setHasUnsavedChanges(true);
    setSyncStatus('pending');
    setSyncMessage('Cambios sin guardar');
  }

  async function handleSave() {
    setIsSaving(true);
    const testPayload = {
      date: todayString(),
      day_type_id: 'dtyp_001',
      note: 'Registro de prueba desde la app (fase 1)',
      habitValues: [],
      score_day: 75,
      score_week: 0,
      score_month: 0,
    };
    const result = await sheetsClient.saveDaily(testPayload);
    setResponse(result);
    if (result.ok) {
      setHasUnsavedChanges(false);
      setSyncStatus('ok');
      setSyncMessage('Guardado correctamente');
    } else {
      setSyncStatus('error');
      setSyncMessage(result.error || 'Error al guardar');
    }
    setIsSaving(false);
  }

  // ---- Render ----

  return (
    <div style={{ paddingBottom: 80 }}>
      <header style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface)',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Hábitos</h1>
        <SyncStatus
          status={syncStatus}
          message={syncMessage}
          lastSync={getLastSyncTime()}
        />
      </header>

      <main className="container" style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Fase 1 — Verificación de conexión
          </h2>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            Esta pantalla es solo para probar que React, Google Apps Script y Google Sheets
            están correctamente conectados. No es la UI final.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePing} disabled={loading}>
              🔌 Probar conexión
            </button>
            <button className="btn btn-secondary" onClick={handleSetup} disabled={loading}>
              🛠 Crear hojas (setup)
            </button>
            <button className="btn btn-secondary" onClick={handleReadAll} disabled={loading}>
              📥 Leer datos
            </button>
            <button className="btn btn-secondary" onClick={handleMarkChanges} disabled={loading}>
              ✏️ Simular cambio
            </button>
          </div>
        </div>

        {loading && (
          <div className="card" style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            ⏳ Esperando respuesta del servidor…
          </div>
        )}

        {response !== null && (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Respuesta del servidor
            </h3>
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}

        <div className="card" style={{ fontSize: 13 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Instrucciones rápidas
          </h3>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Despliega <code>Code.gs</code> en Google Apps Script como Web App.</li>
            <li>Copia la URL del despliegue y pégala en <code>.env</code> como <code>VITE_APPS_SCRIPT_URL</code>.</li>
            <li>Pulsa <strong>Crear hojas (setup)</strong> para inicializar Google Sheets.</li>
            <li>Pulsa <strong>Probar conexión</strong> para verificar que responde.</li>
            <li>Pulsa <strong>Leer datos</strong> para ver el contenido de todas las hojas.</li>
            <li>Pulsa <strong>Simular cambio</strong> y luego <strong>Guardar</strong> para probar escritura.</li>
          </ol>
        </div>

      </main>

      <FloatingSaveButton
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
}
