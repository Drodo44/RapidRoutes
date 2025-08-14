// pages/api/fetchDatBlog.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";

async function fetchHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": "RapidRoutesBot/1.0" } });
  if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
  return await r.text();
}

function detectMaps(html) {
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*?(?:alt="([^"]*)")?/gi)].map((m) => ({
    src: m[1],
    alt: (m[2] || "").toLowerCase(),
  }));
  const find = (kw) =>
    imgs
      .filter((i) => i.alt.includes(kw) || new RegExp(kw, "i").test(i.src))
      .map((i) => i.src)[0] || null;

  return {
    van: find("van"),
    reefer: find("reefer"),
    flatbed: find("flatbed"),
  };
}

async function uploadPublic(bucket, path, arrayBuffer) {
  const { error } = await supabase.storage.from(bucket).upload(path, Buffer.from(arrayBuffer), {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
}

export default async function handler(_req, res) {
  try {
    const html = await fetchHtml("https://www.dat.com/blog");
    const maps = detectMaps(html);
    const date = new Date().toISOString().slice(0, 10);

    const inserted = [];
    for (const equip of ["van", "reefer", "flatbed"]) {
      const url = maps[equip];
      if (!url) continue;
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const path = `${date}/${equip}.png`;
      await uploadPublic("dat_maps", path, buf);
      const { error } = await supabase
        .from("dat_maps")
        .upsert(
          { effective_date: date, equipment: equip, image_path: path, summary: `Auto-fetched ${equip} map` },
          { onConflict: "effective_date,equipment" }
        );
      if (error) throw error;
      inserted.push({ equip, path });
    }
    return res.status(200).json({ ok: true, inserted });
  } catch (e) {
    return res.status(500).json({ error: e.message || "fetchDatBlog failed" });
  }
}
