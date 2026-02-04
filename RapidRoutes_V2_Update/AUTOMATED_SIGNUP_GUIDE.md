# 🎉 Automated Team Signup - Complete!

## How It Works Now

### For New Users (Apprentice/Support):

**Signup Flow:**
1. Go to `/signup`
2. Enter email and password
3. **Select broker team from dropdown** (shows all active brokers)
4. **Choose role:**
   - **Apprentice** (📖 View Only) - Can see lanes, recaps, data but cannot create/edit
   - **Support** (✏️ Full Access) - Can create lanes, generate CSVs, manage team data
5. Click "Sign up"
6. Account is **automatically approved** and assigned to selected team!
7. Redirected to login

**What Happens Behind the Scenes:**
- User account created in Supabase Auth
- Profile automatically configured with:
  - `organization_id` = selected broker's organization_id
  - `team_role` = 'member'
  - `role` = selected role (Apprentice or Support)
  - `status` = 'approved' (instant access!)

### For Brokers:

**You remain the team owner:**
- Your profile: `team_role = 'owner'`, `role = 'Admin'` (or 'Broker')
- Your `organization_id` = your user ID
- You show up in the dropdown for new signups

**To create another broker team:**
1. Admin manually creates new user in Supabase
2. Set their profile:
   ```sql
   UPDATE profiles SET
     organization_id = id,  -- Their user ID becomes their org ID
     team_role = 'owner',
     role = 'Broker',
     status = 'approved'
   WHERE email = 'newbroker@example.com';
   ```
3. They now have their own team!

---

## API Endpoints Created

### `GET /api/teams`
**Purpose:** List all available broker teams for signup dropdown

**Response:**
```json
{
  "teams": [
    {
      "organization_id": "uuid-here",
      "broker_name": "aconnellan",
      "broker_email": "aconnellan@tql.com",
      "broker_id": "uuid-here"
    }
  ]
}
```

**Filters:**
- Only shows brokers with `role = 'Broker'`
- Only shows team owners (`team_role = 'owner'`)
- Only shows approved brokers (`status = 'approved'`)

### `POST /api/teams`
**Purpose:** Assign new user to team with role

**Request Body:**
```json
{
  "userId": "new-user-uuid",
  "organizationId": "broker-org-uuid",
  "role": "Apprentice" or "Support"
}
```

**Validation:**
- ✅ Only allows "Apprentice" or "Support" roles
- ✅ Verifies organization exists and is valid
- ✅ Auto-approves member (no manual approval needed)

**Response:**
```json
{
  "success": true,
  "profile": { updated profile data },
  "message": "Successfully joined team as Apprentice"
}
```

---

## UI Updates

### Signup Page (`pages/signup.js`)

**New Fields:**
1. **Team Dropdown**
   - Loads teams on page load via `GET /api/teams`
   - Shows broker name + email: "aconnellan (aconnellan@tql.com)"
   - Auto-selects first team if available
   - Shows "Loading teams..." while fetching
   - Shows "No teams available" if empty

2. **Role Selection**
   - Radio buttons or dropdown
   - Two options:
     - **Apprentice**: "📖 View Only - Can view lanes and data but cannot create or edit"
     - **Support**: "✏️ Full Access - Can create lanes, generate CSVs, and manage team data"
   - Defaults to Apprentice (safer default)

3. **Auto-Approval**
   - No waiting for admin to approve
   - Instant access after signup
   - User can login immediately

---

## Testing the Flow

### Test New User Signup:

1. **Open incognito/private window** (so you're not logged in)
2. Go to your deployed app's `/signup` page
3. **Verify you see:**
   - Email field
   - Password field
   - "Select Broker Team" dropdown with your name
   - "Your Role" dropdown with Apprentice/Support
4. **Fill out form:**
   - Use test email (e.g., `test-apprentice@example.com`)
   - Choose your team from dropdown
   - Select "Apprentice" role
5. **Submit and verify:**
   - Should redirect to `/login`
   - Login with test credentials
   - Should see dashboard with your lanes!

### Verify in Database:

```bash
node -e "import { createClient } from '@supabase/supabase-js'; import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const r = await s.from('profiles').select('*').eq('email', 'test-apprentice@example.com').single(); console.log(JSON.stringify(r.data, null, 2));"
```

**Should show:**
- `organization_id` = your organization_id
- `team_role` = 'member'
- `role` = 'Apprentice'
- `status` = 'approved'

---

## Benefits

✅ **No Manual Work**: Team members self-assign during signup
✅ **Instant Access**: Auto-approved, no waiting
✅ **Secure**: Only Apprentice/Support can signup (Brokers are admin-created)
✅ **User-Friendly**: Clear role descriptions, dropdown selection
✅ **Scalable**: Works for multiple broker teams
✅ **Safe**: Still works with RLS disabled (can enable RLS when ready)

---

## Next Steps

**Option 1: Test the signup flow** (Recommended first!)
- Create test apprentice account
- Verify they see your lanes
- Test with RLS still disabled

**Option 2: Enable RLS** (After testing signup)
- Enable RLS on one table: `ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;`
- Test immediately: You should see all lanes, apprentice sees only your team's lanes
- If it works, enable on remaining tables

**Option 3: Add more brokers**
- Manually create broker accounts in Supabase
- Set their `organization_id = id` and `team_role = 'owner'`
- They'll appear in signup dropdown for their team members

---

## Rollback Plan

If something breaks:
1. RLS is still disabled, so no data access issues
2. Old signup still works (just doesn't set team)
3. Can manually update profiles in Supabase if needed
4. Can revert code via `git revert 6d860de`

---

**Status: Ready to test!** 🚀

The signup flow is live on your deployed app. Try creating a test account to see it in action!
