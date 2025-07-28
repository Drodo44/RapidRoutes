export default function IntermodalPopup({ open, onSend, onSkip }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl max-w-md text-white shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Intermodal Check</h2>
        <p className="mb-6">Would you like to send an email to verify if this lane could move intermodal before posting?</p>
        <div className="flex gap-4">
          <button onClick={onSend} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded">Send Email</button>
          <button onClick={onSkip} className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded">Skip & Generate CSV</button>
        </div>
      </div>
    </div>
  );
}
