// Updated export component: HTML export only
// The recap page is meant to be exported as styled HTML rather than Excel or PDF.
import { triggerRecapDownload } from "../lib/exportRecap";

export default function RecapExportButtons() {
  /**
   * Export the current recap table to HTML.  The recap page wraps its
   * contents in an element with id="recap-root"; triggerRecapDownload will
   * open a new window containing that HTML with embedded styling and allow
   * the user to print or save as HTML/PDF via the browser.  This approach
   * avoids generating Excel or PDF files on the client and keeps the
   * styling consistent with the dark mode UI.
   */
  const handleExport = () => {
    triggerRecapDownload();
  };
  return (
    <div className="flex gap-4 mb-6 justify-center">
      <button
        onClick={handleExport}
        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-white font-semibold"
      >
        Export Recap
      </button>
    </div>
  );
}
