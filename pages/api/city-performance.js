// pages/api/city-performance.js
// Smart City Learning API - Track coverage success by city and method

function isMissingColumnError(error) {
  const message = String(error?.message || '');
  return /column .* does not exist/i.test(message);
}

function normalizeContactMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  if (method === 'email') return 'email';
  if (method === 'phone' || method === 'call') return 'phone';
  return 'unknown';
}

async function insertContactLog({ supabaseAdmin, payload }) {
  const nowIso = new Date().toISOString();
  const basePayload = {
    lane_id: payload.laneId,
    city: payload.city,
    state: payload.state,
    city_type: payload.cityType || null,
    contact_method: payload.contactMethod,
    contact_received_at: nowIso,
    reference_id: payload.referenceId || null,
    notes: payload.notes || null,
    user_id: payload.userId || null,
    organization_id: payload.organizationId || null,
    created_at: nowIso
  };

  const cityPerformancePayloads = [
    basePayload,
    { ...basePayload, organization_id: undefined },
    { ...basePayload, user_id: undefined, organization_id: undefined },
    {
      lane_id: basePayload.lane_id,
      city: basePayload.city,
      state: basePayload.state,
      city_type: basePayload.city_type,
      contact_method: basePayload.contact_method,
      contact_received_at: basePayload.contact_received_at,
      reference_id: basePayload.reference_id,
      notes: basePayload.notes
    }
  ].map((entry) => {
    const cleaned = {};
    Object.entries(entry).forEach(([key, value]) => {
      if (value !== undefined) cleaned[key] = value;
    });
    return cleaned;
  });

  let cityPerformanceError = null;
  for (const insertPayload of cityPerformancePayloads) {
    const { data, error } = await supabaseAdmin
      .from('city_performance')
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (!error) {
      return { success: true, table: 'city_performance', data };
    }

    cityPerformanceError = error;
    if (!isMissingColumnError(error)) {
      break;
    }
  }

  // Fallback for older environments that still rely on a legacy contacts table.
  const contactPayloads = [
    {
      lane_id: payload.laneId,
      contact_method: payload.contactMethod,
      city: payload.city,
      state: payload.state,
      notes: payload.notes || null,
      user_id: payload.userId || null,
      organization_id: payload.organizationId || null,
      created_at: nowIso
    },
    {
      lane_id: payload.laneId,
      contact_method: payload.contactMethod,
      notes: payload.notes || null,
      created_at: nowIso
    },
    {
      lane_id: payload.laneId,
      contact_method: payload.contactMethod
    }
  ];

  let contactsError = null;
  for (const insertPayload of contactPayloads) {
    const cleaned = {};
    Object.entries(insertPayload).forEach(([key, value]) => {
      if (value !== undefined) cleaned[key] = value;
    });

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(cleaned)
      .select()
      .maybeSingle();

    if (!error) {
      return { success: true, table: 'contacts', data };
    }

    contactsError = error;
    if (!isMissingColumnError(error)) {
      break;
    }
  }

  return {
    success: false,
    error: contactsError || cityPerformanceError || new Error('Unable to write contact log')
  };
}

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

  if (req.method === 'POST') {
    try {
      const {
        laneId,
        city,
        state,
        cityType,
        contactMethod,
        referenceId,
        notes,
        kma,
        coverageSource,
        rrNumber,
        laneGroupId
      } = req.body || {};

      // Contact logging mode (Recap Log Call / Log Email)
      if (laneId && city && state && contactMethod) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ error: 'Missing authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        if (profileError) {
          return res.status(403).json({ error: 'Unable to resolve organization scope' });
        }

        const { data: lane, error: laneError } = await supabaseAdmin
          .from('lanes')
          .select('id, organization_id, user_id')
          .eq('id', laneId)
          .maybeSingle();
        if (laneError || !lane) {
          return res.status(404).json({ error: 'Lane not found' });
        }

        const organizationId = profile?.organization_id || null;
        if (organizationId && lane.organization_id && lane.organization_id !== organizationId) {
          return res.status(403).json({ error: 'Lane is outside your organization scope' });
        }
        if (!organizationId && lane.user_id && lane.user_id !== user.id) {
          return res.status(403).json({ error: 'Lane is outside your user scope' });
        }

        const writeResult = await insertContactLog({
          supabaseAdmin,
          payload: {
            laneId,
            city,
            state,
            cityType: cityType === 'pickup' || cityType === 'delivery' ? cityType : null,
            contactMethod: normalizeContactMethod(contactMethod),
            referenceId,
            notes: String(notes || '').trim() || null,
            userId: user.id,
            organizationId
          }
        });

        if (!writeResult.success) {
          throw writeResult.error;
        }

        return res.status(200).json({
          success: true,
          mode: 'contact_log',
          table: writeResult.table,
          message: `Contact logged for ${city}, ${state}`,
          data: writeResult.data || null
        });
      }

      if (!city || !state || !coverageSource) {
        return res.status(400).json({ error: 'Missing required fields: city, state, coverageSource' });
      }

      // Validate coverage source
      const validSources = ['IBC', 'OBC', 'Email'];
      if (!validSources.includes(coverageSource)) {
        return res.status(400).json({ error: 'Invalid coverageSource. Must be IBC, OBC, or Email' });
      }

      // Upsert city performance record
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('city_performance')
        .select('*')
        .eq('city', city)
        .eq('state', state)
        .single();

      let updatedData;
      
      if (existing) {
        // Update existing record
        const newIBC = existing.covers_ibc + (coverageSource === 'IBC' ? 1 : 0);
        const newOBC = existing.covers_obc + (coverageSource === 'OBC' ? 1 : 0);
        const newEmail = existing.covers_email + (coverageSource === 'Email' ? 1 : 0);
        const newTotal = existing.covers_total + 1;
        
        // Auto-star if >= 5 IBCs or >= 10 total
        const isStarred = newIBC >= 5 || newTotal >= 10;

        const { data, error } = await supabaseAdmin
          .from('city_performance')
          .update({
            kma: kma || existing.kma,
            covers_total: newTotal,
            covers_ibc: newIBC,
            covers_obc: newOBC,
            covers_email: newEmail,
            last_success: new Date().toISOString(),
            is_starred: isStarred,
            updated_at: new Date().toISOString()
          })
          .eq('city', city)
          .eq('state', state)
          .select()
          .single();

        if (error) throw error;
        updatedData = data;
      } else {
        // Insert new record
        const isStarred = coverageSource === 'IBC' ? false : false; // Will be starred after 5 IBCs

        const { data, error } = await supabaseAdmin
          .from('city_performance')
          .insert({
            city,
            state,
            kma: kma || null,
            covers_total: 1,
            covers_ibc: coverageSource === 'IBC' ? 1 : 0,
            covers_obc: coverageSource === 'OBC' ? 1 : 0,
            covers_email: coverageSource === 'Email' ? 1 : 0,
            last_success: new Date().toISOString(),
            is_starred: isStarred
          })
          .select()
          .single();

        if (error) throw error;
        updatedData = data;
      }

      // Update the lane record with coverage info
      if (rrNumber) {
        const { error: laneError } = await supabaseAdmin
          .from('lanes')
          .update({
            lane_status: 'covered',
            coverage_source: coverageSource,
            updated_at: new Date().toISOString()
          })
          .eq('rr_number', rrNumber);

        if (laneError) {
          console.error('Error updating lane status:', laneError);
        }
      }

      // If laneGroupId provided, mark all lanes in group as covered
      if (laneGroupId) {
        const { error: groupError } = await supabaseAdmin
          .from('lanes')
          .update({
            lane_status: 'covered',
            updated_at: new Date().toISOString()
          })
          .eq('lane_group_id', laneGroupId);

        if (groupError) {
          console.error('Error updating lane group:', groupError);
        }
      }

      return res.status(200).json({
        success: true,
        cityPerformance: updatedData,
        message: `Coverage recorded: ${city}, ${state} via ${coverageSource}`
      });

    } catch (error) {
      console.error('Error recording city performance:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    // Get starred cities or all city performance data
      try {
      const { starred, city, state } = req.query;

      let query = supabaseAdmin.from('city_performance').select('*');      if (starred === 'true') {
        query = query.eq('is_starred', true);
      }

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (state) {
        query = query.eq('state', state);
      }

      query = query.order('covers_total', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({ success: true, data });

    } catch (error) {
      console.error('Error fetching city performance:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
