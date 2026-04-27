// api/sheets.js — Vercel Serverless Function
// Actúa como proxy entre la app y Google Apps Script
// evitando las restricciones CORS del navegador

export default async function handler(req, res) {
  // Permitir CORS desde cualquier origen (solo nuestra app lo usa)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbX776913ZhL5kJrJq1cdEY8FvrMG6SSXXWvApoRl-E5SmWKU1YHc13lOMrUN2GKo_/exec";

  try {
    if (req.method === "GET") {
      // Leer datos de Sheets
      const response = await fetch(`${SCRIPT_URL}?action=read`, {
        method: "GET",
        redirect: "follow",
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // Escribir datos en Sheets
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(req.body),
        redirect: "follow",
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ status: "error", message: err.toString() });
  }
}
