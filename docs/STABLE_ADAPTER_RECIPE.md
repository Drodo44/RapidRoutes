# ✅ Intelligence API Adapter - Stable Version

This adapter works with the live backend as of commit: `bf2284695690b57a80bf883fe27c7560195e21ef`.

## Required Fields

- destination_city
- destination_state
- origin_city
- origin_state
- equipment_code

## Required Headers

- Authorization: Bearer `<token>`

## Notes

- Must use snake_case for backend compatibility
- Ensure token is included from Supabase session
- Adapter file: `/utils/intelligenceApiAdapter.js`
- Tested successfully in `FINAL_INTELLIGENCE_API_SUCCESS.md`

> 💡 All future modifications must preserve this contract.
