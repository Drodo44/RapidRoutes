// pages/_app.js
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white font-sans">
      <Component {...pageProps} />
    </main>
  );
}
