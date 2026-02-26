const express = require("express");
const admin = require("firebase-admin");
const https = require("https");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://photo-share-app-c65fd-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();
const app = express();
app.use(express.json());

// ═══════════════════════════════════════════
// 🔧 OneSignal API দিয়ে notification পাঠানো
// ═══════════════════════════════════════════
const ONESIGNAL_APP_ID = "de1d5e11-90fd-4e5d-8f30-8018855c36d0";

async function sendOneSignalToAll(title, body, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: title },
      contents: { en: body },
      data: data,
      android_sound: "default",
      priority: 10
    });

    const options = {
      hostname: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        console.log(`✅ OneSignal সবাইকে পাঠানো হয়েছে: ${title}`);
        resolve(data);
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sendOneSignalToUser(externalUserId, title, body, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      filters: [{ field: "tag", key: "uid", relation: "=", value: externalUserId }],
      headings: { en: title },
      contents: { en: body },
      data: data,
      android_sound: "default",
      priority: 10
    });

    const options = {
      hostname: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        console.log(`✅ OneSignal → ${externalUserId}: ${title}`);
        resolve(data);
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
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
  const body = post.content ? `${post.content.substring(0, 70)}...` : "নতুন পোস্ট দেখুন";
  await sendOneSignalToAll(`📝 ${name} নতুন পোস্ট করেছেন!`, body, { type: "new_post" });
});

// ═══════════════════════════════════════════
// 📷 ছবি পোস্ট → সবাইকে
// ═══════════════════════════════════════════
db.ref("photos").on("child_added", async (snap) => {
  const post = snap.val();
  if (!post || !isNew(post)) return;
  const name = post.authorName || post.userName || "কেউ একজন";
  const body = post.caption ? post.caption.substring(0, 70) : "নতুন ছবি দেখুন";
  await sendOneSignalToAll(`📷 ${name} নতুন ছবি পোস্ট করেছেন!`, body, { type: "new_photo" });
});

// ═══════════════════════════════════════════
// 🎥 ভিডিও পোস্ট → সবাইকে
// ═══════════════════════════════════════════
db.ref("videos").on("child_added", async (snap) => {
  const post = snap.val();
  if (!post || !isNew(post)) return;
  const name = post.authorName || post.userName || "কেউ একজন";
  const body = post.caption ? post.caption.substring(0, 70) : "নতুন ভিডিও দেখুন";
  await sendOneSignalToAll(`🎥 ${name} নতুন ভিডিও পোস্ট করেছেন!`, body, { type: "new_video" });
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
    const senderId = msg.senderUid || msg.uid || msg.senderId;
    if (!senderId) return;
    const uids = chatId.split("_");
    const receiverId = uids.find(id => id !== senderId);
    if (!receiverId) return;
    const senderSnap = await db.ref(`users/${senderId}`).once("value");
    const sender = senderSnap.val();
    const senderName = sender?.name || "কেউ একজন";
    const msgText = msg.text || "";
    await sendOneSignalToUser(receiverId, `💌 ${senderName}`, msgText ? msgText.substring(0, 80) : "নতুন ম্যাসেজ পাঠিয়েছেন", { type: "message" });
  });
});

// ═══════════════════════════════════════════
// 👋 Friend Request → receiver কে
// ═══════════════════════════════════════════
db.ref("friendRequests").on("child_added", (receiverSnap) => {
  const receiverUid = receiverSnap.key;
  db.ref(`friendRequests/${receiverUid}`).on("child_added", async (reqSnap) => {
    const req = reqSnap.val();
    if (!req || !isNew({ ts: req.ts || 0 })) return;
    const senderUid = reqSnap.key;
    const senderSnap = await db.ref(`users/${senderUid}`).once("value");
    const sender = senderSnap.val();
    const senderName = sender?.name || "কেউ একজন";
    await sendOneSignalToUser(receiverUid, `👋 ${senderName} Friend Request পাঠিয়েছেন`, "Accept করতে অ্যাপ খুলুন", { type: "friend_request" });
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
  await sendOneSignalToAll(notif.title, notif.body || "", { type: "admin" });
  await snap.ref.update({ sentAt: new Date().toISOString(), status: "sent" });
});

// ═══════════════════════════════════════════
// ⏰ Daily Notification
// ═══════════════════════════════════════════
app.get("/daily-notif", async (req, res) => {
  if (req.query.secret !== "meetapp2024") return res.status(403).json({ error: "Unauthorized" });
  await sendOneSignalToAll("🌅 MeetApp", "আজকের নতুন পোস্ট ও আপডেট দেখুন 👀", { type: "daily" });
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
