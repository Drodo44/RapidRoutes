import { useState, useEffect, useRef } from "react";
import supabase from "../utils/supabaseClient";

/*  Autocomplete for cities table (city, state_or_province)  */
export default function CityAutocomplete({ value, onChange, placeholder }) {
  const [sugg, setSugg]   = useState([]);
  const boxRef            = useRef(null);

  /* close list when clicking outside */
  useEffect(() => {
    const click = (e) => { if (!boxRef.current?.contains(e.target)) setSugg([]); };
    window.addEventListener("mousedown", click);
    return () => window.removeEventListener("mousedown", click);
  }, []);

  /* fetch match list from Supabase */
  const fetchCities = async (txt) => {
    if (txt.length < 2) return setSugg([]);
    const { data } = await supabase
      .from("cities")
      .select("city,state_or_province")
      .ilike("city", `${txt}%`)
      .limit(10);
    setSugg(data || []);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); fetchCities(e.target.value); }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm focus:ring-2 focus:ring-[#4361EE] outline-none"
      />

      {sugg.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-[#1E222B] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
          {sugg.map((c) => (
            <li
              key={`${c.city},${c.state_or_province}`}
              onClick={() => { onChange(`${c.city}, ${c.state_or_province}`); set
