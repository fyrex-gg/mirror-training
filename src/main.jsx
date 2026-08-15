import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Program from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Program />
  </StrictMode>
);

// Registration must not block or crash the app — it should still run fine
// when opened somewhere a service worker can't register (e.g. file://).
window.addEventListener("load", () => {
  if (!("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  } catch (e) {
    /* app still runs without the service worker */
  }
});
