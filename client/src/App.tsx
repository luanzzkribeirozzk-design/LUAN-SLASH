import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const VIDEO_FILE = "/AhaTik_nikkiloslindo_6636ff17-99c9-4bfa-9f1f-1c35a3f9b277_.mp4";

function VideoPlayer() {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-50 cursor-pointer"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          ✕
        </button>

        <video
          autoPlay
          controls
          className="w-full h-full object-contain"
          style={{ maxHeight: "100vh" }}
        >
          <source src={VIDEO_FILE} type="video/mp4" />
          Seu navegador não suporta vídeo.
        </video>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <button
        onClick={() => setIsOpen(true)}
        className="
          px-16 py-6
          border-2 border-white/30
          text-white
          text-2xl font-bold
          tracking-[6px]
          cursor-pointer
          transition-all duration-300
          hover:border-white/80
          hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]
          hover:scale-105
          active:scale-95
        "
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        ABRIR
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <VideoPlayer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
