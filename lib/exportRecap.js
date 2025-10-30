// lib/exportRecap.js

export function triggerRecapDownload() {
  const printContents = document.querySelector("#recap-root")?.innerHTML;
  if (!printContents) {
    console.error("Recap content not found.");
    return;
  }

  const htmlContent = `
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
  `;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Recap-${new Date().toISOString().split("T")[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
