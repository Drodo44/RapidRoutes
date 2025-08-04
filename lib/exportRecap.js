// lib/exportRecap.js

export function triggerRecapDownload() {
  const printContents = document.querySelector("#recap-root")?.innerHTML;
  const w = window.open("", "Recap Export");
  w.document.write(`
    <html>
      <head>
        <title>Active Postings – Recap</title>
        <style>
          body { font-family: sans-serif; background: #0b1623; color: white; padding: 2rem; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #444; padding: 8px; text-align: left; }
          thead { background: #233056; color: #22d3ee; }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}
