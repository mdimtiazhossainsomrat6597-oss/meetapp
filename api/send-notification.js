const ONESIGNAL_APP_ID = "81132740-4821-41ec-a750-d0433b5e6660";
const ONESIGNAL_API_KEY = "os_v2_app_qejsoqciefa6zj2q2bbtwxtgmcedum4ttgveihvxhxhehfeioo7rl2krutv6wpuhzyl667uijdf2x3opqwks74hst4botearhlc6qgq";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { playerIds, title, message, data } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      data: data || {}
    };
    if (playerIds === 'ALL') {
      payload.included_segments = ['All'];
    } else if (Array.isArray(playerIds) && playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    } else {
      return res.status(400).json({ error: 'Invalid playerIds' });
    }
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'OneSignal API error', details: result });
    return res.status(200).json({ success: true, id: result.id, recipients: result.recipients });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}
