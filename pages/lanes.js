// pages/lanes.js
import { useState } from "react";
import equipmentTypes from "../data/equipmentTypes";
import { generateDATCsv, downloadCsv } from "../lib/datExport";
import { searchCities } from "../utils/citySearch";
import IntermodalPopup from "../components/IntermodalPopup";

export default function Lanes() {
  const [lanes, setLanes] = useState([emptyLane()]);
  const [showModalIndex, setShowModalIndex] = useState(null);

  function emptyLane() {
    return {
      originQuery: "", originCity: "", originState: "", originZip: "",
      destQuery: "", destCity: "", destState: "", destZip: "",
      earliest: "", latest: "", length: "", weight: "",
      equipment: "FD", comment: "",
      randomize: false, minWeight: "", maxWeight: "",
      intermodal: false,
      originOptions: [], destOptions: []
    };
  }

  const handleChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newLanes = [...lanes];
    newLanes[index][name] = type === "checkbox" ? checked : value;

    // Trigger Intermodal modal if intermodal toggled on
    if (name === "intermodal" && checked) {
      setShowModalIndex(index);
    }

    setLanes(newLanes);
  };

  const handleCityInput = async (index, type, value) => {
    const newLanes = [...lanes];
    newLanes[index][`${type}Query`] = value;
    newLanes[index][`${type}Options`] = await searchCities(value);
    setLanes(newLanes);
  };

  const handleCitySelect = (index, type, cityObj) => {
    const newLanes = [...lanes];
    newLanes[index][`${type}Query`] = `${cityObj.city}, ${cityObj.state}`;
    newLanes[index][`${type}City`] = cityObj.city;
    newLanes[index][`${type}State`] = cityObj.state;
    newLanes[index][`${type}Zip`] = cityObj.zip;
    newLanes[index][`${type}Options`] = [];
    setLanes(newLanes);
  };

  const addLane = () => setLanes([...lanes, emptyLane()]);
  const removeLane = (index) => setLanes(lanes.filter((_, i) => i !== index));
  const handleExport = () => {
    const csv = generateDATCsv(lanes);
    downloadCsv(csv);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-full overflow-x-auto">
        <h1 className="text-4xl font-bold mb-6 text-cyan-400">Lane Entry</h1>
        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-2">Origin</th>
              <th className="p-2">Destination</th>
              <th className="p-2">Earliest</th>
              <th className="p-2">Latest</th>
              <th className="p-2">Length</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Rand?</th>
              <th className="p-2">Min</th>
              <th className="p-2">Max</th>
              <th className="p-2">Equipment</th>
              <th className="p-2">Comment</th>
              <th className="p-2">Intermodal</th>
              <th className="p-2">Remove</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane, index) => (
              <tr key={index} className="even:bg-gray-900 odd:bg-gray-800">
                <td className="p-2 relative">
                  <input
                    type="text"
                    value={lane.originQuery}
                    onChange={(e) => handleCityInput(index, "origin", e.target.value)}
                    placeholder="City, ST or ZIP"
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                  {lane.originOptions.length > 0 && (
                    <ul className="absolute bg-gray-900 border border-gray-700 mt-1 z-10 w-full max-h-40 overflow-y-auto">
                      {lane.originOptions.map((city, i) => (
                        <li
                          key={i}
                          onClick={() => handleCitySelect(index, "origin", city)}
                          className="px-3 py-1 hover:bg-gray-800 cursor-pointer"
                        >
                          {city.city}, {city.state} {city.zip}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="p-2 relative">
                  <input
                    type="text"
                    value={lane.destQuery}
                    onChange={(e) => handleCityInput(index, "dest", e.target.value)}
                    placeholder="City, ST or ZIP"
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                  {lane.destOptions.length > 0 && (
                    <ul className="absolute bg-gray-900 border border-gray-700 mt-1 z-10 w-full max-h-40 overflow-y-auto">
                      {lane.destOptions.map((city, i) => (
                        <li
                          key={i}
                          onClick={() => handleCitySelect(index, "dest", city)}
                          className="px-3 py-1 hover:bg-gray-800 cursor-pointer"
                        >
                          {city.city}, {city.state} {city.zip}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="p-2">
                  <input type="date" name="earliest" value={lane.earliest} onChange={(e) => handleChange(index, e)} className="input" />
                </td>
                <td className="p-2">
                  <input type="date" name="latest" value={lane.latest} onChange={(e) => handleChange(index, e)} className="input" />
                </td>
                <td className="p-2">
                  <input type="number" name="length" value={lane.length} onChange={(e) => handleChange(index, e)} className="input" />
                </td>
                <td className="p-2">
                  <input type="number" name="weight" value={lane.weight} onChange={(e) => handleChange(index, e)} className="input" />
                </td>
                <td className="p-2 text-center">
                  <input type="checkbox" name="randomize" checked={lane.randomize} onChange={(e) => handleChange(index, e)} />
                </td>
                <td className="p-2">
                  <input type="number" name="minWeight" value={lane.minWeight} onChange={(e) => handleChange(index, e)} className="input" disabled={!lane.randomize} />
                </td>
                <td className="p-2">
                  <input type="number" name="maxWeight" value={lane.maxWeight} onChange={(e) => handleChange(index, e)} className="input" disabled={!lane.randomize} />
                </td>
                <td className="p-2">
                  <select name="equipment" value={lane.equipment} onChange={(e) => handleChange(index, e)} className="input">
                    {equipmentTypes.map((eq) => (
                      <option key={eq.code} value={eq.code}>
                        {eq.code} – {eq.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input type="text" name="comment" value={lane.comment} onChange={(e) => handleChange(index, e)} className="input" />
                </td>
                <td className="p-2 text-center">
                  <input type="checkbox" name="intermodal" checked={lane.intermodal} onChange={(e) => handleChange(index, e)} />
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => removeLane(index)} className="text-red-400 hover:text-red-600 font-bold">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <button onClick={addLane} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold shadow-xl">
            Add Lane
          </button>
          {lanes.length > 0 && (
            <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold shadow-xl">
              Save & Generate DAT CSV
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          padding: 0.5rem;
          background: #1e293b;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          color: white;
          width: 100%;
        }
      `}</style>

      {showModalIndex !== null && (
        <IntermodalPopup
          lane={lanes[showModalIndex]}
          onClose={() => setShowModalIndex(null)}
        />
      )}
    </main>
  );
}
