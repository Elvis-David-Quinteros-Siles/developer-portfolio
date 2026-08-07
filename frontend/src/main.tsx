import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";

import interWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";

// Preload de la fuente crítica (URL con hash resuelta por Vite)
const preload = document.createElement("link");
preload.rel = "preload";
preload.as = "font";
preload.type = "font/woff2";
preload.href = interWoff2;
preload.crossOrigin = "anonymous";
document.head.appendChild(preload);

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No se encontró el elemento #root");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
