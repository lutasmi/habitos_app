// api/sheets.js — Vercel Serverless Function (lightweight)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx0X776913ZhL5kJrJq1cdEY8FvrMG6SSXXWvApoRl-E5SmWKU1YHc13lOMrUN2GKo_/exec";

export const config = {
  runtime: "edge", // Edge runtime — usa ~5MB en lugar de 254MB
};

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method === "GET") {
      const res  = await fetch(`${SCRIPT_URL}?action=read`, { redirect: "follow" });
      const text = await res.text();
      return new Response(text, { status: 200, headers });
    }

    if (req.method === "POST") {
      const body = await req.text();
      const res  = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body,
        redirect: "follow",
      });
      const text = await res.text();
      return new Response(text, { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.toString() }), { status: 500, headers });
  }
}
