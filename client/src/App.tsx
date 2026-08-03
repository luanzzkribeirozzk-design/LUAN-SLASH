import { useState, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function MusicPlayer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState("");
  const [ytReady, setYtReady] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if ((window as any).YT) {
      onYTReady();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);

    (window as any).onYouTubeIframeAPIReady = onYTReady;

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const onYTReady = () => {
    setYtReady(true);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setCurrentSong(searchQuery.trim());
    setIsPlaying(true);

    // Destroy old player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Create new YouTube player with search
    if (containerRef.current && (window as any).YT) {
      containerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-player-new";
      containerRef.current.appendChild(div);

      playerRef.current = new (window as any).YT.Player("yt-player-new", {
        height: "100%",
        width: "100%",
        videoId: "",
        playerVars: {
          listType: "search",
          list: searchQuery.trim(),
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            e.target.playVideo();
          },
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="fixed inset-0 bg-[#121212] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#121212] border-b border-white/5 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold">Music Player</h1>
      </header>

      {/* Search */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o nome da música..."
            className="flex-1 bg-white/10 text-white placeholder-white/40 px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-green-500 text-sm"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-3 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Tocar
          </button>
        </div>
      </div>

      {/* Player area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 min-h-0">
        {isPlaying && currentSong ? (
          <div className="w-full max-w-xl flex flex-col items-center">
            {/* Current song name */}
            <p className="text-white/60 text-sm mb-3 text-center truncate w-full">
              Tocando: <span className="text-white font-medium">{currentSong}</span>
            </p>

            {/* YouTube player container */}
            <div
              ref={containerRef}
              className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-2xl shadow-black/60"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-white/30">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="mb-4">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p className="text-base mb-1">Digite uma música e clique em Tocar</p>
            <p className="text-sm text-white/20">Ex: "Bohemian Rhapsody", "Billie Eilish", "Drake God's Plan"</p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-4 py-2 text-center text-white/20 text-xs flex-shrink-0">
        Busque qualquer música • Toca completa • Sem anúncios no site
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <MusicPlayer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
