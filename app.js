import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, get, query, orderByChild, equalTo, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD97-el91-ISWGkOhxWy4V_wXyOK6MJl0k",
  authDomain: "chatbeat-71f80.firebaseapp.com",
  databaseURL: "https://chatbeat-71f80-default-rtdb.firebaseio.com",
  projectId: "chatbeat-71f80",
  storageBucket: "chatbeat-71f80.firebasestorage.app",
  messagingSenderId: "38692820606",
  appId: "1:38692820606:web:edce5abf8d103e1f6e6a2f",
  measurementId: "G-KZ5KN31YFL"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

const colors = ['#00C896', '#0077FF', '#00FFD1', '#FF6B6B', '#F7DC6F'];
let currentUser = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// AUTO DELETE AFTER 7 DAYS
function deleteOld(path) {
  const weekAgo = Date.now() - 604800000;
  get(ref(db, path)).then(snap => {
    snap.forEach(child => {
      if(child.val().timestamp < weekAgo) remove(ref(db, path + '/' + child.key));
    })
  })
}
setInterval(() => { deleteOld('posts'); deleteOld('globalChat'); }, 3600000);

// REGISTER
document.getElementById('register-btn').onclick = async () => {
 const name = document.getElementById('name-input').value.trim();
 const email = document.getElementById('email-input').value.trim();
 const pass = document.getElementById('pass-input').value.trim();
 const err = document.getElementById('cover-error');
 err.innerText = '';
 if(name.length < 3) { err.innerText = "Name must be 3+ letters"; return; }
 try {
   const cred = await createUserWithEmailAndPassword(auth, email, pass);
   const nameSnap = await get(query(ref(db, 'users'), orderByChild('name'), equalTo(name)));
   if(nameSnap.exists()) { await deleteUser(cred.user); err.innerText = "Name already taken!"; return; }
   await set(ref(db, 'users/' + cred.user.uid), { name, email, color: colors[Math.floor(Math.random()*colors.length)] });
 } catch(e) { err.innerText = e.message; }
}

// LOGIN / LOGOUT / AUTH
document.getElementById('login-btn').onclick = () => {
 const email = document.getElementById('email-input').value.trim();
 const pass = document.getElementById('pass-input').value.trim();
 signInWithEmailAndPassword(auth, email, pass).catch(e => { document.getElementById('cover-error').innerText = e.message; });
}
document.getElementById('logout-btn').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
 if(user) {
   currentUser = user;
   document.getElementById('cover').style.display = 'none';
   document.getElementById('app').style.display = 'block';
   loadPosts(); loadChat();
 } else {
   document.getElementById('cover').style.display = 'flex';
   document.getElementById('app').style.display = 'none';
 }
});

// POST
document.getElementById('post-btn').onclick = async () => {
  const text = document.getElementById('post-text').value.trim();
  if(!text) return;
  await push(ref(db, 'posts'), { uid: currentUser.uid, text, timestamp: Date.now() });
  document.getElementById('post-text').value = '';
}
function loadPosts() {
  onChildAdded(query(ref(db, 'posts'), orderByChild('timestamp')), async (snap) => {
    const post = snap.val();
    const userSnap = await get(ref(db, 'users/' + post.uid));
    const user = userSnap.val();
    const postDiv = document.createElement('div');
    postDiv.className = 'card';
    postDiv.innerHTML = `<b style="color:${user.color}">${user.name}</b><p>${post.text}</p>`;
    document.getElementById('feed').prepend(postDiv);
  });
}

// VOICENOTE + CHAT
const recordBtn = document.getElementById('record-btn');
recordBtn.onclick = async () => {
  if(!isRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks);
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        await push(ref(db, 'globalChat'), { uid: currentUser.uid, audio: reader.result, timestamp: Date.now() });
      }
    }
    mediaRecorder.start();
    recordBtn.innerText = "⏹️ Tap to Send";
    recordBtn.classList.add('record-btn');
    isRecording = true;
  } else {
    mediaRecorder.stop();
    recordBtn.innerText = "🎤 Tap to Record";
    recordBtn.classList.remove('record-btn');
    isRecording = false;
  }
}

document.getElementById('send-chat').onclick = async () => {
  const text = document.getElementById('chat-input').value.trim();
  if(!text) return;
  await push(ref(db, 'globalChat'), { uid: currentUser.uid, text, timestamp: Date.now() });
  document.getElementById('chat-input').value = '';
}

function loadChat() {
  onChildAdded(query(ref(db, 'globalChat'), orderByChild('timestamp')), async (snap) => {
    const msg = snap.val();
    const userSnap = await get(ref(db, 'users/' + msg.uid));
    const user = userSnap.val();
    const msgDiv = document.createElement('div');
    msgDiv.style.margin = '5px 0';
    if(msg.audio) {
      msgDiv.innerHTML = `<b style="color:${user.color}">${user.name}:</b> <audio controls src="${msg.audio}"></audio>`;
    } else {
      msgDiv.innerHTML = `<b style="color:${user.color}">${user.name}:</b> ${msg.text}`;
    }
    document.getElementById('global-chat').appendChild(msgDiv);
  });
}