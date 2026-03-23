const ONESIGNAL_APP_ID = "81132740-4821-41ec-a750-d0433b5e6660";
const ONESIGNAL_API_KEY = "os_v2_app_qejsoqciefa6zj2q2bbtwxtgmako77xovx3uu2vzi3xgtaxty6rjz6dhd34qqv2xjcbo7gfevnh3wr6fylsxrv4rahenskn5vytxexq";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
      payload.include_subscription_ids = playerIds;
    } else {
      return res.status(400).json({ error: 'Invalid playerIds' });
    }

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('OneSignal response:', JSON.stringify(result));
    
    if (!response.ok) return res.status(response.status).json({ error: 'OneSignal API error', details: result });
    return res.status(200).json({ success: true, id: result.id, recipients: result.recipients });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}
