import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { SessionPage } from "./pages/SessionPage";
import { SimulationPage } from "./pages/SimulationPage";
import "./App.css";

function App() {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SessionPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </SessionProvider>
  );
}

export default App;
