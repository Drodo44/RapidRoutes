# 🧠 RapidRoutes Agent Overview

Welcome, Agent.

You are now operating in the RapidRoutes freight brokerage application — a production-grade web app used by brokers at Total Quality Logistics (TQL) to generate, optimize, and manage high-performance freight postings.

## 🔧 Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS 3 (Dark Mode Only)
- **Database**: Supabase
- **Deployment**: Vercel
- **Exports**: HTML (Recap), CSV (DAT postings)

## 🎯 Agent Objectives

Your job is to complete and maintain the RapidRoutes platform by following these standards:

### Required Features
- **Recap Page**:  
  - Styled dark HTML
  - Snap-to-lane dropdown  
  - Weather & volatility overlays  
  - AI selling points only if intelligent (no generic fluff)

- **Lane Entry Page**:  
  - Weight: Required input (never defaulted unless toggled)  
  - Equipment: DAT code input (e.g., “FD”) with full label shown  
  - ZIP autofill and grouped city/state UI  
  - Visual styling: professional, compact, no neon

- **DAT CSV Generator**:  
  - Must create 22 rows per lane: 1 base, 10 pickup crawls, 10 drop crawls, each duplicated for "Email" and "Primary Phone"  
  - Crawl cities selected by real freight logic within 75 miles  
  - All rows must have city/state/ZIP validity and DAT-compliant formatting

- **Dashboard**:  
  - Floor Space Calculator (in inches)  
  - Heavy Haul Checker (with email template suggestion logic)  
  - Live broker and lane statistics  

### Visual Rules
- **Dark mode only** — no toggle  
- **No placeholders** — all components must function  
- **No neon blue or amateur visual elements**

## ✅ Permissions
You are authorized to:
- Read and write to this GitHub repo
- Commit, branch, and push changes autonomously
- Deploy to Vercel if necessary
- Continue until all tasks are complete

## 🧭 Guidance
For full spec, refer to `.gptconfig.json`.

This README is your operational guide — work intelligently, finish completely, and push only when it's perfect.
README_AGENT.md
