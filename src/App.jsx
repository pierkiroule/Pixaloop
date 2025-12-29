import './App.css';

function App() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Vite • React • Ready for Vercel</p>
        <h1>Welcome to Pixaloop</h1>
        <p className="lede">
          This starter ships with a modern Vite + React toolchain, linting, and a deployment config
          tuned for Vercel. Start the dev server, build, and ship with confidence.
        </p>
        <div className="actions">
          <a className="button" href="https://vitejs.dev/guide/" target="_blank" rel="noreferrer">
            Read the Vite guide
          </a>
          <a className="button ghost" href="https://vercel.com/docs" target="_blank" rel="noreferrer">
            Deploy on Vercel
          </a>
        </div>
      </header>
      <section className="info">
        <div>
          <h2>Local development</h2>
          <ol>
            <li>Install dependencies with <code>npm install</code>.</li>
            <li>Run <code>npm run dev</code> and visit the printed localhost URL.</li>
            <li>Update components inside <code>src/</code> and see changes instantly.</li>
          </ol>
        </div>
        <div>
          <h2>Production build</h2>
          <ol>
            <li>Run <code>npm run build</code> to create the optimized <code>dist</code> output.</li>
            <li>Preview locally with <code>npm run preview</code>.</li>
            <li>Push to your repo; Vercel will run the same build command.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}

export default App;
