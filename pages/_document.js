// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head />
      <body className="bg-[#0f1115] text-gray-100 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
