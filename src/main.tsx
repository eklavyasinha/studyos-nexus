import { createRoot } from "react-dom/client";
import { StoreProvider } from "./lib/store";
import App from "./App";
import "./styles.css";
try {
  const saved = JSON.parse(
    localStorage.getItem("studyos-nexus:appearance") || "{}",
  );
  document.documentElement.dataset.theme =
    saved.theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : saved.theme || "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}
createRoot(document.getElementById("root")!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
