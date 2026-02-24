const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://photo-share-app-c65fd-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();
const app = express();
app.use(express.json());

// 🔧 একজনকে নোটিফিকেশন পাঠানো
async function sendToUser(uid, title, body, data = {}) {
  const tokenSnap = await db.ref(`fcmTokens/${uid}`).once("value");
  const token = tokenSnap.val();
  if (!token) return;
  await admin.messaging().send({
    token, notification: { title, body }, data,
    android: { priority: "high", notification: { sound: "default", channelId: "default" } },
    webpush: { headers: { Urgency: "high" }, notification: { icon: "https://ui-avatars.com/api/?name=MA&size=192&background=6c63ff&color=ffffff" } }
  });
  console.log(`✅ → ${uid}: ${title}`);
}

// 🔧 সব ইউজারকে নোটিফিকেশন পাঠানো
async function sendToAll(title, body, data = {}) {
  const snapshot = await db.ref("fcmTokens").once("value");
  if (!snapshot.exists()) return;
  const tokens = [];
  snapshot.forEach(child => { if (child.val()) tokens.push(child.val()); });
  if (!tokens.length) return;
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const messages = chunk.map(token => ({
      token, notification: { title, body }, data,
      android: { priority: "high", notification: { sound: "default", channelId: "default" } },
      webpush: { headers: { Urgency: "high" }, notification: { icon: "https://ui-avatars.com/api/?name=MA&size=192&background=6c63ff&color=ffffff" } }
    }));
    const result = await admin.messaging().sendEach(messages);
    console.log(`✅ ${result.successCount} জনকে পাঠানো হয়েছে`);
  }
}

// 🔧 নতুন কিনা চেক (৩০ সেকেন্ড)
function isNew(val) {
  const ts = val?.uploadDate ? new Date(val.uploadDate).getTime() : val?.id || val?.ts || val?.time || 0;
  return Date.now() - ts < 30000;
}

// ═══════════════════════════════════════════
// 📝 টেক্সট পোস্ট → সবাইকে
// ═══════════════════════════════════════════
db.ref("textPosts").on("child_added", async (snap) => {
  const post = snap.val();
  if (!post || !isNew(post)) return;
  const name = post.authorName || post.userName || "কেউ একজন";
  const body = post.content ? `${post.content.substring(0, 70)}${post.content.length > 70 ? "..." : ""}` : "নতুন পোস্ট দেখুন";
  await sendToAll(`📝 ${name} নতুন পোস্ট করেছেন!`, body, { type: "new_post" });
});

// ═══════════════════════════════════════════
// 📷 ছবি পোস্ট → সবাইকে
// ═══════════════════════════════════════════
db.ref("photos").on("child_added", async (snap) => {
  const post = snap.val();
  if (!post || !isNew(post)) return;
  const name = post.authorName || post.userName || "কেউ একজন";
  const body = post.caption ? post.caption.substring(0, 70) : "নতুন ছবি দেখুন";
  await sendToAll(`📷 ${name} নতুন ছবি পোস্ট করেছেন!`, body, { type: "new_photo" });
});

// ═══════════════════════════════════════════
// 🎥 ভিডিও পোস্ট → সবাইকে
// ═══════════════════════════════════════════
db.ref("videos").on("child_added", async (snap) => {
  const post = snap.val();
  if (!post || !isNew(post)) return;
  const name = post.authorName || post.userName || "কেউ একজন";
  const body = post.caption ? post.caption.substring(0, 70) : "নতুন ভিডিও দেখুন";
  await sendToAll(`🎥 ${name} নতুন ভিডিও পোস্ট করেছেন!`, body, { type: "new_video" });
});

// ═══════════════════════════════════════════
// 💌 ম্যাসেজ → receiver কে
// ═══════════════════════════════════════════
const watchedChats = new Set();
db.ref("messages").on("child_added", (chatSnap) => {
  const chatId = chatSnap.key;
  if (watchedChats.has(chatId)) return;
  watchedChats.add(chatId);

  db.ref(`messages/${chatId}`).on("child_added", async (msgSnap) => {
    const msg = msgSnap.val();
    if (!msg || !isNew(msg)) return;
    const senderId = msg.senderUid || msg.uid || msg.senderId || msg.from;
    if (!senderId) return;
    const uids = chatId.split("_");
    const receiverId = uids.find(id => id !== senderId);
    if (!receiverId) return;
    const senderSnap = await db.ref(`users/${senderId}`).once("value");
    const sender = senderSnap.val();
    const senderName = sender?.name || sender?.displayName || "কেউ একজন";
    const msgText = msg.text || msg.message || msg.content || "";
    await sendToUser(receiverId, `💌 ${senderName}`, msgText ? msgText.substring(0, 80) : "নতুন ম্যাসেজ পাঠিয়েছেন", { type: "message", chatId });
  });
});

// ═══════════════════════════════════════════
// 👋 Friend Request → receiver কে
// ═══════════════════════════════════════════
db.ref("friendRequests").on("child_added", (receiverSnap) => {
  const receiverUid = receiverSnap.key;
  db.ref(`friendRequests/${receiverUid}`).on("child_added", async (reqSnap) => {
    const req = reqSnap.val();
    if (!req || !isNew({ ts: req.ts || req.time || 0 })) return;
    const senderUid = reqSnap.key;
    const senderSnap = await db.ref(`users/${senderUid}`).once("value");
    const sender = senderSnap.val();
    const senderName = sender?.name || sender?.displayName || "কেউ একজন";
    await sendToUser(receiverUid, `👋 ${senderName} Friend Request পাঠিয়েছেন`, "Accept করতে অ্যাপ খুলুন", { type: "friend_request", fromUid: senderUid });
  });
});

// ═══════════════════════════════════════════
// 👑 Admin Broadcast → সবাইকে
// ═══════════════════════════════════════════
db.ref("broadcastNotif").on("child_added", async (snap) => {
  const notif = snap.val();
  if (!notif || !notif.title) return;
  const ts = notif.createdAt ? new Date(notif.createdAt).getTime() : 0;
  if (Date.now() - ts > 30000) return;
  await sendToAll(notif.title, notif.body || "", { type: "admin" });
  await snap.ref.update({ sentAt: new Date().toISOString(), status: "sent" });
});

// ═══════════════════════════════════════════
// ⏰ Daily Notification (cron-job.org থেকে)
// ═══════════════════════════════════════════
app.get("/daily-notif", async (req, res) => {
  if (req.query.secret !== "meetapp2024") return res.status(403).json({ error: "Unauthorized" });
  await sendToAll("🌅 MeetApp", "আজকের নতুন পোস্ট ও আপডেট দেখুন 👀", { type: "daily" });
  res.json({ success: true });
});

// ═══════════════════════════════════════════
// 🏥 Health Check
// ═══════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({ status: "✅ MeetApp Notification Server চালু আছে!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server চালু: port ${PORT}`));
