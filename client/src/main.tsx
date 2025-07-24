import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Debug log to verify React is loading
console.log("React app starting...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  console.log("Root element found, creating React app...");
  createRoot(rootElement).render(<App />);
  console.log("React app rendered successfully!");
}
