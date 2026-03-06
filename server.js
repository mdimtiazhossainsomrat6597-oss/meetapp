const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ONESIGNAL_APP_ID = 'df8597d9-1032-4b6f-8634-43ca9f24f308';
const ONESIGNAL_API_KEY = 'os_v2_app_36czpwiqgjfw7bruipfj6jhtbdryg3vn4njeivei3kehlsr7rve6o6vm76mv2xxudcvkcjhcvmldc57y5gwhsoccwhobohilzzyfimq';

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Firebase init error:', err.message);
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MeetApp Server চালু আছে ✅' });
});

// নির্দিষ্ট user-কে notification (externalId = Firebase UID)
app.post('/send-notification', async (req, res) => {
  const { token, externalId, title, body } = req.body;
  if (!title) return res.status(400).json({ error: 'title আবশ্যক' });
  const targetId = externalId || (token && (token.externalId || token.uid));
  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body || '' },
      priority: 10,
      android_sound: 'notification',
      ios_sound: 'notification.wav',
      android_channel_id: 'meetapp_channel',
    };
    if (targetId) {
      payload.include_aliases = { external_id: [String(targetId)] };
      payload.target_channel = 'push';
    } else {
      payload.included_segments = ['All'];
    }
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Key ' + ONESIGNAL_API_KEY },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    console.log('✅ OneSignal:', JSON.stringify(data));
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// সবাইকে broadcast
app.post('/send-all', async (req, res) => {
  const { title, body } = req.body;
  if (!title) return res.status(400).json({ error: 'title আবশ্যক' });
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Key ' + ONESIGNAL_API_KEY },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: body || '' },
        priority: 10,
        android_sound: 'notification',
        ios_sound: 'notification.wav',
      }),
    });
    const data = await response.json();
    console.log('✅ Broadcast:', JSON.stringify(data));
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 MeetApp Server running on port ' + PORT);
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT;
    fetch(url + '/').then(() => console.log('✅ Self-ping')).catch(() => {});
  }, 14 * 60 * 1000);
});
