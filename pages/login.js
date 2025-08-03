import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Login(){
  const [email,setEmail]=useState("");
  const[err,setErr]=useState("");
  const router=useRouter();

  const handle=async()=>{
    setErr("");
    const { error }=await supabase.auth.signInWithOtp({ email });
    if(error) setErr(error.message);
    else alert("Check your email link");
  };

  return(
    <div className="min-h-screen flex items-center justify-center bg-[#14181F] text-[#E2E8F0]">
      <div className="w-full max-w-sm bg-[#1E222B] p-8 rounded-xl border border-gray-800 space-y-6">
        <h1 className="text-xl font-bold text-center">RapidRoutes Login</h1>
        <input type="email" placeholder="your@email.com"
          value={email} onChange={e=>setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
        {err&&<div className="text-red-400 text-sm">{err}</div>}
        <button onClick={handle}
          className="w-full py-2 rounded bg-[#4361EE] hover:bg-[#364db9] font-semibold">Send Magic Link</button>
        <button onClick={()=>router.push("/")}
          className="w-full py-2 rounded bg-gray-600 hover:bg-gray-500 text-sm">Back to Home</button>
      </div>
    </div>
  );
}
