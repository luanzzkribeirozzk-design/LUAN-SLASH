import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import GameCanvas from "./components/GameCanvas";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <GameCanvas />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
