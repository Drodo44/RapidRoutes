import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </Head>
      <body className="bg-gray-950 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
