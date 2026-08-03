import { useState, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function MusicPlayer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null);
  const [showSearch, setShowSearch] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  interface VideoInfo {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
  }

  interface SearchResult {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
  }

  // Search using YouTube's own search (no API key, no CORS issues)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);

    try {
      // Use YouTube's own search page scraping via the oEmbed-compatible approach
      // We'll use the YouTube Data API v3 free tier alternative:
      // Direct YouTube search embed + extract results
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

      // Since we can't fetch YouTube directly (CORS), we use a workaround:
      // Generate search results using YouTube's suggest API
      const suggestUrl = `https://suggestqueries-clients6.youtube.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(searchQuery)}`;

      try {
        const res = await fetch(suggestUrl);
        const data = await res.json();
        // data[1] contains suggestions
        const suggestions: string[] = data[1] || [];

        // For each suggestion, try to get video info via YouTube's noembed
        // But that won't give us video IDs either. Let's use a different approach:
        // We'll search via a proxy-friendly endpoint

        const results = await searchViaPiped(searchQuery);
        setSearchResults(results);
      } catch {
        // Fallback: try piped API
        const results = await searchViaPiped(searchQuery);
        setSearchResults(results);
      }
    } catch {
      setSearchResults([]);
    }
    setLoading(false);
  };

  async function searchViaPiped(query: string): Promise<SearchResult[]> {
    // Try multiple Piped instances
    const instances = [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.adminforge.de",
      "https://pipedapi.leptons.xyz",
      "https://api.piped.yt",
      "https://pipedapi.lunar.icu",
      "https://pipedapi.privacy.com.de",
    ];

    for (const instance of instances) {
      try {
        const res = await fetch(
          `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const items = data.items || [];
        return items.slice(0, 20).map((item: any) => ({
          id: item.url?.replace("/watch?v=", "") || "",
          title: item.title || "Unknown",
          channel: item.uploaderName || item.uploader || "Unknown",
          thumbnail: item.thumbnail || "",
        })).filter((item: any) => item.id);
      } catch {
        continue;
      }
    }

    // If all Piped instances fail, use a fallback approach
    // Generate results from YouTube suggestions
    return await searchViaSuggestions(query);
  }

  async function searchViaSuggestions(query: string): Promise<SearchResult[]> {
    try {
      const res = await fetch(
        `https://suggestqueries-clients6.youtube.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      const suggestions: string[] = data[1] || [];

      // For suggestions, create mock results that link to YouTube search
      // We'll use these as clickable items that open YouTube embed
      return suggestions.slice(0, 10).map((suggestion: string, index: number) => ({
        id: `search:${encodeURIComponent(suggestion)}`,
        title: suggestion,
        channel: "YouTube",
        thumbnail: `https://i.ytimg.com/vi/${index}/default.jpg`,
      }));
    } catch {
      return [];
    }
  }

  const playVideo = (result: SearchResult) => {
    setCurrentVideo({
      id: result.id,
      title: result.title,
      channel: result.channel,
      thumbnail: result.thumbnail,
    });
    setShowSearch(false);
  };

  const playSearch = (query: string) => {
    // Play first result from YouTube search for this query
    setCurrentVideo({
      id: `search:${encodeURIComponent(query)}`,
      title: query,
      channel: "YouTube",
      thumbnail: "",
    });
    setShowSearch(false);
  };

  // Determine if this is a search query or a direct video
  const getPlayerEmbedUrl = () => {
    if (!currentVideo) return "";
    if (currentVideo.id.startsWith("search:")) {
      // It's a search query - embed YouTube search results
      const query = decodeURIComponent(currentVideo.id.replace("search:", ""));
      return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
    }
    return `https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`;
  };

  return (
    <div className="fixed inset-0 bg-[#121212] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#121212] border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold tracking-tight">Music Player</h1>
        {currentVideo && !showSearch && (
          <button
            onClick={() => { setShowSearch(true); setCurrentVideo(null); }}
            className="ml-auto text-white/50 hover:text-white text-sm"
          >
            ← Buscar
          </button>
        )}
      </header>

      {/* Search section */}
      {showSearch && (
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar música, artista..."
              className="flex-1 bg-white/10 text-white placeholder-white/40 px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-3 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Player view */}
        {!showSearch && currentVideo && (
          <div className="mt-2">
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black mb-4">
              <iframe
                ref={iframeRef}
                src={getPlayerEmbedUrl()}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="Music Player"
              />
            </div>
            <h2 className="text-lg font-bold mb-1 px-1">{currentVideo.title}</h2>
            <p className="text-sm text-white/50 px-1">{currentVideo.channel}</p>
          </div>
        )}

        {/* Search results */}
        {showSearch && searchResults.length > 0 && (
          <div className="mt-2">
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Resultados</h2>
            <div className="space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => result.id.startsWith("search:") ? playSearch(decodeURIComponent(result.id.replace("search:", ""))) : playVideo(result)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-white/5">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <p className="text-xs text-white/50 truncate">{result.channel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {showSearch && searchResults.length === 0 && !loading && !searchQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-white/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mb-3">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p className="text-sm">Busque uma música para começar</p>
          </div>
        )}

        {showSearch && loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-3 border-white/20 border-t-green-500 rounded-full animate-spin" />
          </div>
        )}

        {showSearch && searchResults.length === 0 && !loading && searchQuery && (
          <div className="mt-8 text-center text-white/40 text-sm">
            Nenhum resultado encontrado. Tente outro termo.
          </div>
        )}
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
