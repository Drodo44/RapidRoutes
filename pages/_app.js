// pages/_app.js
import "../styles/globals.css";
import Nav from "../components/Nav";

const AUTH_PAGES = ["/login", "/signup", "/register", "/reset-password", "/auth/callback"];

function App({ Component, pageProps, router }) {
  const hideNav = AUTH_PAGES.some((p) => router.pathname.startsWith(p));
  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      {!hideNav && <Nav />}
      <Component {...pageProps} />
    </div>
  );
}
export default App;
