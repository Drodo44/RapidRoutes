// pages/recap.js

import React from "react";

const Recap = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111827] text-white">
      <h1 className="text-4xl font-bold mb-6 text-neon-blue drop-shadow-lg">
        RapidRoutes Active Postings Recap
      </h1>
      <div className="bg-[#1a2236] rounded-2xl shadow-2xl p-8 w-full max-w-5xl">
        {/* Recap Table would go here. This is placeholder text for now. */}
        <div className="text-center text-lg font-medium text-gray-300">
          Recap table and analytics coming soon.<br />
          Your DAT postings and key lane stats will appear here.
        </div>
      </div>
    </div>
  );
};

export default Recap;
