import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: confirm script executed and root element exists
console.log("[main] script loaded at", new Date().toISOString());
const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error("[main] #root element not found in DOM");
} else {
  console.log("[main] #root found, mounting React app...");
}

// Global error & unhandled rejection logging to surface silent failures
window.addEventListener("error", (e) => {
  console.error("[global error]", e.message, e.error);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[global unhandledrejection]", e.reason);
});

createRoot(rootEl!).render(<App />);
console.log("[main] React app mounted");
