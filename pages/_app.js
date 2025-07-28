// pages/_app.js
import "../styles/globals.css";  // Fixed relative import

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
