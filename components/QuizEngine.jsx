// components/QuizEngine.js
import { useState } from "react";

const sampleQuestions = [
  {
    question: "Maplesville, AL is most likely part of which DAT Market (KMA)?",
    options: ["Birmingham", "Tuscaloosa", "Mobile", "Other"],
    answer: "Birmingham",
  },
  {
    question: "Which trailer is best for a load 10 ft wide and 9 ft tall?",
    options: ["Dry Van", "Step Deck", "Hotshot", "Straight Box"],
    answer: "Step Deck",
  },
];

export default function QuizEngine() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = sampleQuestions[index];

  function submitAnswer() {
    if (selected === current.answer) {
      setScore(score + 1);
    }
    if (index + 1 < sampleQuestions.length) {
      setIndex(index + 1);
      setSelected("");
    } else {
      setFinished(true);
    }
  }

  return (
    <div className="bg-[#1e293b] p-8 rounded-2xl shadow-lg text-white w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-neon-blue mb-4">🚦 Training Quiz</h2>

      {finished ? (
        <div className="text-center">
          <p className="text-xl mb-4">Quiz Complete!</p>
          <p className="text-lg">Score: {score} / {sampleQuestions.length}</p>
        </div>
      ) : (
        <>
          <p className="mb-4">{current.question}</p>
          <div className="space-y-2 mb-6">
            {current.options.map((opt, i) => (
              <label key={i} className="block">
                <input
                  type="radio"
                  value={opt}
                  checked={selected === opt}
                  onChange={() => setSelected(opt)}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
          <button
            onClick={submitAnswer}
            disabled={!selected}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl font-semibold"
          >
            Submit
          </button>
        </>
      )}
    </div>
  );
}
