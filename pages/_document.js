// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Tailwind CSS via CDN */}
        <link
          href="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.2/dist/tailwind.min.css"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-gray-950 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
