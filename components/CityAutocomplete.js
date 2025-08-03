import { useState,useEffect,useRef } from "react";
import supabase from "../utils/supabaseClient";

export default function CityAutocomplete({ value,onChange,placeholder }) {
  const [sugg,setSugg]=useState([]);
  const boxRef=useRef(null);

  useEffect(()=>{
    const click=(e)=>{ if(!boxRef.current?.contains(e.target)) setSugg([]); };
    window.addEventListener("mousedown",click);
    return()=>window.removeEventListener("mousedown",click);
  },[]);

  const fetchCities=async(txt)=>{
    if(txt.length<2){setSugg([]);return;}
    const { data }=await supabase
      .from("cities")             // table: cities(name, state)
      .select("name,state")
      .ilike("name",`${txt}%`)
      .limit(10);
    setSugg(data||[]);
  };

  return(
    <div className="relative" ref={boxRef}>
      <input value={value}
        onChange={e=>{onChange(e.target.value);fetchCities(e.target.value);}}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm focus:ring-2 focus:ring-[#4361EE] outline-none"
      />
      {sugg.length>0&&(
        <ul className="absolute z-20 w-full mt-1 bg-[#1E222B] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
          {sugg.map(c=>(
            <li key={`${c.name},${c.state}`}
              onClick={()=>{onChange(`${c.name}, ${c.state}`);setSugg([]);}}
              className="px-3 py-2 text-sm hover:bg-[#364db9] cursor-pointer">
              {c.name}, {c.state}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
