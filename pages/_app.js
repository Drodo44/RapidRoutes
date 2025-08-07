// pages/_app.js
import "../styles/globals.css";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          body {
            background-color: #0f172a;
            color: #ffffff;
          }
        `}</style>
      </Head>
      <main className="min-h-screen bg-gray-950 text-white">
        <Component {...pageProps} />
      </main>
    </>
  );
}
