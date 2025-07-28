import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Debug log to verify React is loading


const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  
  createRoot(rootElement).render(<App />);
  
}
