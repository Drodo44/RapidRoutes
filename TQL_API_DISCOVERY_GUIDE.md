# TQL API Discovery Guide

## Step-by-Step: Find TQL's Internal API Endpoints

### Prerequisites
- You must be logged into TQL Load Postings Web
- Alternative browser (Vivaldi) OR network inspection tool
- 15 minutes

---

## ⚠️ TQL Blocks DevTools - Use These Alternatives

Since TQL has disabled browser DevTools, here are your options ranked by ease:

### **EASIEST: Method 1 - Use Vivaldi Browser** ✅

Vivaldi has built-in DevTools that TQL likely hasn't blocked:

1. **Download Vivaldi** (free): https://vivaldi.com/download/
2. **Log into TQL Load Postings Web** in Vivaldi
3. **Press F12 or Ctrl+Shift+I** to open DevTools
4. Follow the Network inspection steps below

---

## Method 2: Fiddler/Charles Proxy (Most Reliable)

**Fiddler** (Windows/Mac) or **Charles Proxy** intercepts ALL network traffic - can't be blocked by websites.

### Download:
- **Fiddler Classic** (Free, Windows): https://www.telerik.com/download/fiddler
- **Charles Proxy** (Free 30-day trial): https://www.charlesproxy.com/download/

### Setup Steps:

1. **Install Fiddler/Charles**
2. **Configure HTTPS decryption:**
   - Fiddler: Tools → Options → HTTPS → ✓ Decrypt HTTPS traffic
   - Charles: Proxy → SSL Proxying Settings → ✓ Enable SSL Proxying
3. **Install SSL certificate** (follow prompts from tool)
4. **Start capturing** (should auto-start)
5. **Open TQL Load Postings Web** in ANY browser
6. **Perform actions** (view loads, create posting, etc.)
7. **Look for API calls** in Fiddler/Charles window:
   - Filter by "api" or "load" or "posting" in URL
   - Right-click request → Inspect → See full request/response

### Advantages:
✅ Works with ANY browser (even if DevTools blocked)
✅ Captures authentication tokens automatically
✅ Can save entire session for later analysis
✅ Export as HAR file

---

## Method 3: Browser Extensions (If Allowed)

Some extensions TQL might not block:

- **HTTP Sniffer** (Chrome/Edge)
- **Live HTTP Headers** (Firefox)  
- **Requestly** (Chrome/Firefox)

Try installing one and see if it captures traffic.

---

## Method 4: Network Tab in Vivaldi

### 1. Open Network Inspector
1. Navigate to https://[your-tql-load-postings-url]
2. Press `F12` to open Developer Tools
3. Click **Network** tab
4. Click **XHR/Fetch** filter button (to show only API calls)
5. Check ✓ **Preserve log** (keeps requests after page navigation)

---

## Method 4: Network Tab in Vivaldi

### 1. Open Network Inspector
1. Navigate to https://[your-tql-load-postings-url] in Vivaldi
2. Press `F12` to open Developer Tools
3. Click **Network** tab
4. Click **XHR/Fetch** filter button (to show only API calls)
5. Check ✓ **Preserve log** (keeps requests after page navigation)

### 2. Trigger Load Actions
Perform these actions while watching Network tab:

**Action A: View Active Loads**
- Navigate to "Book It Now" or "Postings" page
- Look for API calls like:
  ```
  GET /loads
  GET /postings/active
  GET /api/v1/broker-loads
  ```

**Action B: Search for Loads**
- Use the search/filter feature
- Look for:
  ```
  POST /loads/search
  GET /loads?pickState=OH&dropState=GA
  ```

**Action C: Create New Posting**
- Click "Create Posting" or "Use Open Load"
- Look for:
  ```
  POST /postings
  POST /postings/create
  PUT /loads/{id}/post
  ```

### 3. Document Each API Call

For EACH request you find:

#### A. Copy Request Details
Click on the API request → **Headers** tab:

```
DOCUMENT THIS:
- Request URL: https://api.tql.com/loads/active
- Request Method: GET or POST
- Status Code: 200 OK
```

#### B. Copy Authentication
Still in Headers tab, find:

```
DOCUMENT THIS:
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Cookie: tql_session=abc123xyz; tql_auth=def456
  X-API-Key: your-api-key-here
```

#### C. Copy Request Body (if POST/PUT)
Click **Payload** tab:

```json
DOCUMENT THIS:
{
  "pickCity": "Cincinnati",
  "pickState": "OH",
  "dropCity": "Atlanta",
  "dropState": "GA",
  "equipment": "FD",
  "pickDate": "2024-01-15"
}
```

#### D. Copy Response Data
Click **Response** or **Preview** tab:

```json
DOCUMENT THIS:
{
  "success": true,
  "loads": [
    {
      "loadId": "L12345",
      "poNumber": "PO12345",
      "pickCity": "Cincinnati",
      "pickState": "OH",
      "pickZip": "45202",
      "dropCity": "Atlanta",
      "dropState": "GA",
      "dropZip": "30303",
      "equipment": "FD",
      "length": 53,
      "weight": 45000,
      "pickDate": "2024-01-15T08:00:00Z",
      "commodity": "Steel Coils"
    }
  ]
}
```

---

## Method 5: Export HAR File (Backup Method)

If you can open DevTools in Vivaldi:

1. In Network tab, right-click any request
2. Select **"Save all as HAR with content"**
3. Save file as `tql-api-capture.har`
4. Upload to RapidRoutes or share for analysis

---

## Method 6: Find Token in Browser Storage

Even if DevTools are blocked in main interface, try these:

### Check localStorage in Vivaldi
1. Open DevTools → **Application** tab (Vivaldi)
2. Expand **Local Storage** → Click your TQL domain
3. Look for keys like:
   ```
   tql_token
   auth_token
   access_token
   bearer_token
   user_session
   ```
4. Copy the value - this is your authentication token

### Alternative: JavaScript Console
If you can access console in Vivaldi:
```javascript
// Run this in browser console (F12 → Console tab)
console.log('LocalStorage:', JSON.stringify(localStorage));
console.log('Cookies:', document.cookie);
```

---

## Method 7: Postman Interceptor (Advanced)

**Postman** can intercept browser requests:

1. **Install Postman** (free): https://www.postman.com/downloads/
2. **Install Postman Interceptor** browser extension
3. **Enable Interceptor** in Postman
4. **Browse TQL in your browser** - Postman captures all requests
5. **View captured requests** in Postman History

---

## What We're Looking For

### ✅ Critical Information Needed

1. **Base API URL**
   ```
   https://api.tql.com
   https://loadmanager.tql.com/api
   https://postings.tql.internal
   ```

2. **Authentication Method**
   - Bearer Token in Authorization header?
   - Cookie-based session?
   - API Key in custom header?
   - How to refresh expired tokens?

3. **Load Listing Endpoint**
   ```
   GET /loads/active
   GET /broker/{brokerId}/loads
   ```

4. **Load Detail Endpoint**
   ```
   GET /loads/{loadId}
   GET /loads/{poNumber}/details
   ```

5. **Create Posting Endpoint**
   ```
   POST /postings
   POST /loads/{loadId}/post
   ```

6. **Update/Delete Posting Endpoints**
   ```
   PUT /postings/{postingId}
   DELETE /postings/{postingId}
   ```

---

## Next Steps After Discovery

Once you have this information:

1. **Create `tql-api-config.json`** with your findings
2. **Test authentication** works from Postman/Insomnia
3. **Implement RapidRoutes proxy** to call TQL API
4. **Build sync service** to poll for new loads

---

## Security Notes

⚠️ **Important:**
- Your authentication tokens are SENSITIVE - treat like passwords
- Tokens may expire (check expiration times)
- Don't commit tokens to git
- Store in environment variables (`.env.local`)
- May need to reverse-engineer token refresh logic

---

## Example: What Success Looks Like

After discovery, you should be able to run this in Postman:

```
GET https://api.tql.com/loads/active
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  
Response:
{
  "loads": [...]
}
```

If you can recreate API calls manually, we can automate them in RapidRoutes.
