import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/logo.png" />
        <meta name="theme-color" content="#080e1b" />
        <meta name="description" content="RapidRoutes – The Gold Standard in Freight Brokerage Intelligence" />
      </Head>
      <body className="bg-gray-950 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
