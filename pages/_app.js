// pages/_app.js
import "../styles/globals.css";
import TopNav from "../components/TopNav";

function MyApp({ Component, pageProps }) {
  return (
    <main className="bg-gray-950 min-h-screen text-white">
      <TopNav />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Component {...pageProps} />
      </div>
    </main>
  );
}

export default MyApp;
