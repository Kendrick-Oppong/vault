function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Vault</h1>
          <p className="text-lg text-muted-foreground">Advanced Desktop YouTube Downloader</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-md space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium text-foreground">
              Video URL
            </label>
            <input
              id="url"
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Download
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono">F12</kbd>{' '}
          to open DevTools
        </div>
      </div>
    </div>
  )
}

export default App
