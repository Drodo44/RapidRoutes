// lib/exportRecap.js

export function triggerRecapDownload() {
  // Get the entire recap page content
  const recapContent = document.documentElement.cloneNode(true);
  
  // Remove no-print elements from clone
  const noPrintElements = recapContent.querySelectorAll('.no-print');
  noPrintElements.forEach(el => el.remove());
  
  // Get the cleaned HTML
  const htmlContent = recapContent.outerHTML;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `RapidRoutes-Recap-${new Date().toISOString().split("T")[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
