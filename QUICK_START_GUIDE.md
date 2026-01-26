# 🚀 RapidRoutes 2.0 - Quick Start Guide

## Access the New Features

1. **Navigate to Recap Page**: https://rapid-routes.vercel.app/recap
2. **Click "✨ Try Recap 2.0"** button in the top-right corner
3. **Explore the Dynamic Interface!**

---

## 🎯 Key Features

### 1. **RR# Search**
- Prefilled with "RR" automatically
- Type any RR# (e.g., "RR29817") to jump to that posting
- Fuzzy search also works with city names

### 2. **Lane Dropdown**
- Select any lane from the alphabetical list
- Shows "Origin → Destination (RR Range)"
- Automatically scrolls to selected lane with neon-cyan highlight

### 3. **Persistent Highlight**
- Selected lanes stay highlighted with neon-cyan glow
- **Press ESC** to clear highlight
- Smooth 200ms animation

### 4. **Mark as Covered**
Click on any "🟡 Posted" status to open the coverage modal:
- 📞 **IBC – Inbound Call**
- 📤 **OBC – Outbound Call**
- ✉️ **Email – Inbound Email**

This records the coverage method and updates city performance!

### 5. **Smart City Stars** ⭐
Cities are automatically starred when they achieve:
- **5+ IBC covers**, OR
- **10+ total covers**

Starred cities show ⭐ in lane headers.

### 6. **Export HTML Recap**
Click "💾 Export HTML Recap" to download:
- Fully interactive standalone HTML file
- Works offline
- Includes dropdown, search, and highlight features
- Print-ready formatting

### 7. **Realtime Updates**
- Lane status changes update automatically
- No page refresh needed
- Event-driven via Supabase channels

---

## 🎨 Status Indicators

| Status | Emoji | Color | Meaning |
|--------|-------|-------|---------|
| Covered | 🟢 | Green | Lane successfully covered |
| Posted | 🟡 | Yellow | Live on DAT loadboard |
| Pending | 🔵 | Blue | Awaiting action |

---

## ⌨️ Keyboard Shortcuts

- **ESC** - Clear current highlight
- **Tab** - Navigate through dropdown
- **Enter** - Select dropdown option

---

## 📊 Coverage Tracking

Every time you mark a lane as covered:
1. City performance is updated automatically
2. Coverage method (IBC/OBC/Email) is recorded
3. City statistics increase:
   - `covers_total` +1
   - `covers_ibc`, `covers_obc`, or `covers_email` +1
4. Cities auto-star at thresholds (5 IBCs or 10 total)

---

## 🔄 Switching Views

**Classic View** → **Dynamic 2.0**:
- Click "✨ Try Recap 2.0" button

**Dynamic 2.0** → **Classic View**:
- Click "Switch to Classic View" in top-right

---

## 💡 Pro Tips

1. **Use RR# Search** to quickly find specific postings
2. **Watch for ⭐** - These cities have proven success
3. **Record coverage source** to track what works best
4. **Export HTML** for offline reference during calls
5. **Collapse lanes** you've already reviewed to save space
6. **Press ESC** after reviewing each lane to clear highlight

---

## 🐛 Need Help?

**Issues?**
- Refresh the page if lanes don't load
- Check browser console for errors
- Ensure you're logged in with active session

**Database Migration Required:**
```bash
# Run this SQL script to enable city performance tracking
psql $DATABASE_URL < sql/create-city-performance.sql
```

---

## 📞 Coverage Source Guidelines

**IBC (Inbound Call)** - Carrier called you  
**OBC (Outbound Call)** - You called carrier  
**Email** - Covered via email/online booking  

Recording this data helps optimize future lane generation!

---

## 🎯 Monday Presentation Highlights

**Show off these features:**
1. ✅ RR# search and instant navigation
2. ✅ Lane dropdown with smart scrolling
3. ✅ Coverage modal with emoji labels
4. ✅ Auto-starred cities (⭐)
5. ✅ Interactive HTML export
6. ✅ Realtime updates (no refresh needed)
7. ✅ Smooth animations and neon-cyan highlights

**Demo Flow:**
1. Open Recap 2.0
2. Search for "RR29817"
3. Mark a lane covered → Select IBC
4. Show the ⭐ next to high-performing city
5. Export HTML and show it works offline
6. Press ESC to clear highlight

---

**Ready to go! 🚛💼🎯**
