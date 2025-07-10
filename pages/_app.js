// pages/_app.js
import Head from "next/head";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          .bg-gray-950{background-color:#0f172a;}
          .text-white{color:#ffffff;}
          .flex{display:flex;}
          .items-center{align-items:center;}
          .justify-center{justify-content:center;}
          .min-h-screen{min-height:100vh;}
          .bg-gray-900{background-color:#111827;}
          .p-8{padding:2rem;}
          .rounded-2xl{border-radius:1rem;}
          .shadow-2xl{box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);}
          .text-center{text-align:center;}
          .max-w-md{max-width:28rem;}
          .mx-auto{margin-left:auto;margin-right:auto;}
          .mt-6{margin-top:1.5rem;}
          .text-4xl{font-size:2.25rem;}
          .font-bold{font-weight:700;}
          .text-cyan-400{color:#22d3ee;}
          .mt-4{margin-top:1rem;}
          .text-lg{font-size:1.125rem;}
          .text-gray-300{color:#d1d5db;}
          .gap-4{gap:1rem;}
          .px-6{padding-left:1.5rem;padding-right:1.5rem;}
          .py-3{padding-top:0.75rem;padding-bottom:0.75rem;}
          .bg-blue-600{background-color:#2563eb;}
          .hover\\:bg-blue-700:hover{background-color:#1d4ed8;}
          .rounded-xl{border-radius:0.75rem;}
          .font-semibold{font-weight:600;}
          .bg-green-600{background-color:#16a34a;}
          .hover\\:bg-green-700:hover{background-color:#15803d;}
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
