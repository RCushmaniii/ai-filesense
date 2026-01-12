import { useState } from "react";
import { Search, FolderOpen } from "lucide-react";

function App() {
  const [, setView] = useState<"home" | "search" | "organize">("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                AI
              </span>
            </div>
            <span className="font-semibold">FileSense</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Find & Organize Your Files
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            AI-powered file understanding. Search by meaning, not just filename.
          </p>
        </div>

        {/* Two Big Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
          <button
            onClick={() => setView("search")}
            className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Find a File</h2>
                <p className="text-sm text-muted-foreground">
                  Search using natural language
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setView("organize")}
            className="flex-1 group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Clean Up</h2>
                <p className="text-sm text-muted-foreground">
                  Organize your Desktop & Documents
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Status */}
        <p className="mt-12 text-sm text-muted-foreground">
          No files have been scanned yet
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          Your files never leave your computer
        </div>
      </footer>
    </div>
  );
}

export default App;
