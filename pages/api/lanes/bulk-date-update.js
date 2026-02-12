import { validateApiAuth } from '../../../middleware/auth.unified';
import supabaseAdmin from '../../../lib/supabaseAdmin';
import { getUserOrganizationId } from '../../../lib/organizationHelper';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return { __parseError: true };
    }
  }
  if (typeof body === 'object') return body;
  return {};
}

function parseDateOnly(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;

  const [year, month, day] = dateMatch[1].split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return utcDate;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function calculateDateSpanDays(pickupEarliest, pickupLatest) {
  const earliest = parseDateOnly(pickupEarliest);
  const latest = parseDateOnly(pickupLatest);
  if (!earliest || !latest) return 0;

  const delta = Math.round((latest.getTime() - earliest.getTime()) / DAY_MS);
  return Number.isFinite(delta) ? Math.max(delta, 0) : 0;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
  }

  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  const body = parseRequestBody(req.body);
  if (body.__parseError) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const laneIds = Array.isArray(body.laneIds)
    ? [...new Set(body.laneIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];

  if (laneIds.length === 0) {
    return res.status(400).json({ error: 'At least one lane id is required' });
  }

  const pickupDate = parseDateOnly(body.pickup_earliest);
  if (!pickupDate) {
    return res.status(400).json({ error: 'pickup_earliest must be a valid YYYY-MM-DD date' });
  }
  const pickupEarliest = formatDateOnly(pickupDate);

  const setLatestForMissing = body.set_latest_for_missing === true;
  const latestForMissingDate = setLatestForMissing ? parseDateOnly(body.latest_for_missing) : null;
  if (setLatestForMissing && !latestForMissingDate) {
    return res.status(400).json({ error: 'latest_for_missing must be a valid YYYY-MM-DD date when enabled' });
  }
  const latestForMissing = latestForMissingDate ? formatDateOnly(latestForMissingDate) : null;

  try {
    const { data: lanes, error: lanesError } = await supabaseAdmin
      .from('lanes')
      .select('id, organization_id, created_by, lane_status, pickup_earliest, pickup_latest')
      .in('id', laneIds);

    if (lanesError) {
      console.error('[bulk-date-update] Failed to load lanes:', lanesError);
      return res.status(500).json({ error: 'Failed to load lanes for update' });
    }

    if (!lanes || lanes.length === 0) {
      return res.status(404).json({ error: 'No lanes found for the provided IDs' });
    }

    const isAdmin = auth.profile?.role === 'Admin';
    const userOrganizationId = isAdmin ? null : await getUserOrganizationId(auth.user.id);

    const scopedLanes = isAdmin
      ? lanes
      : lanes.filter((lane) => {
          if (userOrganizationId) {
            return lane.organization_id === userOrganizationId;
          }
          return lane.created_by === auth.user.id || lane.organization_id === auth.user.id;
        });

    if (scopedLanes.length !== laneIds.length) {
      return res.status(403).json({ error: 'Not authorized to update one or more selected lanes' });
    }

    const currentLanes = scopedLanes.filter((lane) => (lane.lane_status || 'current') === 'current');
    if (currentLanes.length === 0) {
      return res.status(400).json({ error: 'No current lanes were selected' });
    }

    const updates = currentLanes.map((lane) => {
      let nextPickupLatest = null;

      if (lane.pickup_latest) {
        const spanDays = calculateDateSpanDays(lane.pickup_earliest, lane.pickup_latest);
        nextPickupLatest = formatDateOnly(addUtcDays(pickupDate, spanDays));
      } else if (setLatestForMissing) {
        nextPickupLatest = latestForMissing;
      }

      return {
        id: lane.id,
        pickup_earliest: pickupEarliest,
        pickup_latest: nextPickupLatest
      };
    });

    await Promise.all(
      updates.map(async (update) => {
        const { error: updateError } = await supabaseAdmin
          .from('lanes')
          .update({
            pickup_earliest: update.pickup_earliest,
            pickup_latest: update.pickup_latest
          })
          .eq('id', update.id);

        if (updateError) {
          throw updateError;
        }
      })
    );

    return res.status(200).json({
      updatedCount: updates.length,
      laneIds: updates.map((update) => update.id)
    });
  } catch (error) {
    console.error('[bulk-date-update] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to update lane dates' });
  }
}
