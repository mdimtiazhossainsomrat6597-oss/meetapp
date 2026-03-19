// ══════════════════════════════════════════════════════════════════
// 📢 MeetApp Notification Helper
// এই পুরো <script> block টি index.html-এ </body> এর আগে যোগ করো
// ══════════════════════════════════════════════════════════════════

// ✅ তোমার Koyeb server URL এখানে বসাও
const NOTIFY_SERVER = 'https://meetapp-server-kjgy.onrender.com';

// ══════════════════════════════════════════════════════════════════
// 🔧 Core notify function — server-এ request পাঠায়
// ══════════════════════════════════════════════════════════════════
async function _notifyServer(endpoint, payload) {
  try {
    const res = await fetch(`${NOTIFY_SERVER}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) console.warn('⚠️ Notify failed:', data.error);
    return data;
  } catch (err) {
    console.warn('⚠️ Notify server error:', err.message);
    return { success: false };
  }
}

// ══════════════════════════════════════════════════════════════════
// 💬 কমেন্ট করলে — পোস্ট মালিককে notification
// কোথায় ডাকবে: যেখানে comment submit হয় সেখানে
// notify_comment(ownerUid, currentUser.name, commentText)
// ══════════════════════════════════════════════════════════════════
function notify_comment(toUid, fromName, text) {
  if (!toUid || toUid === currentUser?.uid) return; // নিজেকে নয়
  _notifyServer('/notify/comment', { toUid, fromName, extra: text });
}

// ══════════════════════════════════════════════════════════════════
// ❤️ লাইক দিলে — পোস্ট মালিককে notification
// notify_like(ownerUid, currentUser.name, 'পোস্টে')
// ══════════════════════════════════════════════════════════════════
function notify_like(toUid, fromName, extra) {
  if (!toUid || toUid === currentUser?.uid) return;
  _notifyServer('/notify/like', { toUid, fromName, extra });
}

// ══════════════════════════════════════════════════════════════════
// 👥 ফ্রেন্ড রিকোয়েস্ট দিলে
// notify_friend(targetUid, currentUser.name)
// ══════════════════════════════════════════════════════════════════
function notify_friend(toUid, fromName) {
  if (!toUid || toUid === currentUser?.uid) return;
  _notifyServer('/notify/friend', { toUid, fromName });
}

// ══════════════════════════════════════════════════════════════════
// ➕ ফলো করলে
// notify_follow(targetUid, currentUser.name)
// ══════════════════════════════════════════════════════════════════
function notify_follow(toUid, fromName) {
  if (!toUid || toUid === currentUser?.uid) return;
  _notifyServer('/notify/follow', { toUid, fromName });
}

// ══════════════════════════════════════════════════════════════════
// ✉️ মেসেজ দিলে
// notify_message(receiverUid, currentUser.name, messageText)
// ══════════════════════════════════════════════════════════════════
function notify_message(toUid, fromName, text) {
  if (!toUid || toUid === currentUser?.uid) return;
  _notifyServer('/notify/message', { toUid, fromName, extra: text });
}

// ══════════════════════════════════════════════════════════════════
// 🎉 ইভেন্ট অ্যাড করলে — সবাইকে notification
// notify_event(currentUser.name, eventTitle)
// ══════════════════════════════════════════════════════════════════
function notify_event(fromName, eventTitle) {
  _notifyServer('/notify/event', { fromName, extra: eventTitle });
}

// ══════════════════════════════════════════════════════════════════
// 📢 Manual Admin Broadcast (Admin Panel থেকে)
// notify_broadcast(title, body)
// ══════════════════════════════════════════════════════════════════
function notify_broadcast(title, body) {
  _notifyServer('/notify/all', { title, body, emoji: '📢' });
}

// ══════════════════════════════════════════════════════════════════
// ✅ Backward Compatibility
// পুরনো: sendUserNotification(uid, message, emoji, ...) → এখনো কাজ করবে
// ══════════════════════════════════════════════════════════════════
function sendUserNotification(toUid, message, emoji, refId, type) {
  if (!toUid || !message) return;
  const cleanMsg = message.replace(/<[^>]+>/g, ''); // HTML strip
  _notifyServer('/notify/user', {
    uid: toUid,
    title: 'MeetApp ' + (emoji || '🔔'),
    body: cleanMsg.slice(0, 100),
    emoji: emoji || '🔔',
  });
}
