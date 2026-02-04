export function deepEqual(a,b){
  if(a===b) return true;
  if(typeof a!==typeof b) return false;
  if(a&&b&&typeof a==='object'){
    if(Array.isArray(a)!==Array.isArray(b)) return false;
    const ak = Object.keys(a), bk = Object.keys(b);
    if(ak.length!==bk.length) return false;
    for(const k of ak){ if(!deepEqual(a[k], b[k])) return false; }
    return true;
  }
  return false;
}