// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="description" content="RapidRoutes – Redefine the Game. Outsmart the Lane." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-gray-950 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
