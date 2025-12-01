# Admin View Toggle - Quick Reference

## What It Does
Allows Admin users to switch between:
- **"All RapidRoutes Lanes"** - See all teams' lanes (4 total)
- **"My Team's Lanes"** - See only your team's lanes (3 total)

## Button Location
Top-right of Lane Management page, next to "Set Dates for All Lanes" button

## Visual States

### Default: All RapidRoutes Lanes
```
┌─────────────────────────────────────────────────────────┐
│  Lane Management                      [Toggle] [Set Dates]│
│  Create and manage freight lanes...                       │
└─────────────────────────────────────────────────────────┘
                                           ↑
                                    Gray button with
                                    checkbox icon
```

Button text: "All RapidRoutes Lanes"
- Background: Gray (surface color)
- Shows: All 4 current lanes including Kyle's

### Active: My Team's Lanes
```
┌─────────────────────────────────────────────────────────┐
│  Lane Management                      [Toggle] [Set Dates]│
│  Create and manage freight lanes...                       │
└─────────────────────────────────────────────────────────┘
                                           ↑
                                    Blue button with
                                    checkbox icon
```

Button text: "My Team's Lanes"
- Background: Blue (active state)
- Shows: Only 3 Team Connellan lanes (Kyle's excluded)

## Lane Comparison

### All Lanes View (4 lanes)
- RR72138: Blackshear, GA → (Team Connellan)
- RR39767: McDavid, FL → (Team Connellan)
- RR61723: McDavid, FL → (Team Connellan)
- **RR81856: Pearl City, IL → Belleville, MI** (Team Taylor - Kyle)

### My Team's Lanes View (3 lanes)
- RR72138: Blackshear, GA → (Team Connellan)
- RR39767: McDavid, FL → (Team Connellan)
- RR61723: McDavid, FL → (Team Connellan)
- ~~RR81856~~ (not visible)

## Who Sees the Toggle?
- ✅ **Admin users** (aconnellan@tql.com) - Toggle button visible
- ❌ **Broker users** (ktaylor@tql.com, emilysmith@tql.com) - No toggle, see only their lanes
- ❌ **Support users** - No toggle, see only their team's lanes
- ❌ **Apprentice users** (dtisdale@tql.com) - No toggle, see only their team's lanes

## Usage Tips

### Daily Broker Work
1. Toggle ON → "My Team's Lanes"
2. Work with your 3 lanes
3. No confusion from other teams' lanes

### System Administration
1. Toggle OFF → "All RapidRoutes Lanes"  
2. View all teams' activity
3. Monitor system-wide lane creation
4. Check for issues across all brokers

### When to Use Each View

**Use "My Team's Lanes" when:**
- Creating lanes for your team
- Managing pickup dates
- Generating DAT exports for your book
- Daily broker operations

**Use "All RapidRoutes Lanes" when:**
- Checking system health
- Reviewing other brokers' work
- Training new users
- Troubleshooting issues
- Monitoring overall platform usage

## Technical Details

- Toggle state persists during session (not across page reloads)
- Automatic reload when toggled
- Fast switching (< 1 second)
- No database writes (read-only filter)
- Works with search, filters, and archives

## Testing the Feature

1. Open http://localhost:3000/lanes
2. Log in as admin
3. Look for toggle button in top-right
4. Click to switch views
5. Watch lane count change
6. Click again to switch back

## Questions?

- Why 4 vs 3 lanes? One lane belongs to Kyle's team
- Can I see other specific teams? Not yet - only "all" or "mine"
- Does this affect exports? No, exports use current visible lanes
- Does toggle persist? No, resets to "All Lanes" on page reload
