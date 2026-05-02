
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // I hope it's there, if not I'll try another way

// If serviceAccountKey.json is not there, I'll use environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkStatus() {
  const doc = await db.collection('ai_status').doc('macrodroid').get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
  }
}

checkStatus();
