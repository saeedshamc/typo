import { ErrorBoundary } from "./components/ErrorBoundary";
import { CategorySelector } from "./components/CategorySelector";
import { Timer } from "./components/Timer";
import { TypingArea } from "./components/TypingArea";
import { StatsPanel } from "./components/StatsPanel";
import { useTypingStore } from "./store/useTypingStore";

export default function App() {
  const phase = useTypingStore((s) => s.phase);

  return (
    <div className="app">
      <header>
        <h1>TypingTest</h1>
      </header>

      <ErrorBoundary label="انتخاب دسته‌بندی">
        <CategorySelector />
      </ErrorBoundary>

      {phase !== "idle" && (
        <>
          <ErrorBoundary label="تایمر">
            <Timer />
          </ErrorBoundary>

          <ErrorBoundary label="ناحیه‌ی تایپ">
            <TypingArea />
          </ErrorBoundary>
        </>
      )}

      <ErrorBoundary label="آمار">
        <StatsPanel />
      </ErrorBoundary>
    </div>
  );
}
