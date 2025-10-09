// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        {/* Enforce dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
              } catch (e) {}
            `,
          }}
        />
      </Head>
      <body className="antialiased dark">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
