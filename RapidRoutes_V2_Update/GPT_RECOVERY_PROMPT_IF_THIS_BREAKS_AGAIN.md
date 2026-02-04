# 🚨 GPT Recovery Prompt – If Pairing Logic Breaks

Use this exact prompt to restore the system if the intelligent pairing logic breaks or gets replaced with fallbacks:

---

You are restoring the broken intelligence-pairing.js file. The original logic used Supabase and HERE.com to generate city pairings with strict 75–100 mile limits, no retries, and no fallbacks unless forceEmergencyMode is true or the API fails. Your task is to completely remove all fallback logic and retry attempts, and restore the original behavior. Throw an error if 0 results. Do not widen, do not recover. Output only lines 450–658 of the corrected JS file. Do not include test code or explanations.

---
