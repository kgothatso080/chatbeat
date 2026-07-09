// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, get, query, orderByChild, equalTo, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
let currentUser = null;

// REGISTER WITH UNIQUE NAME
document.getElementById('register-btn').onclick = async () => {
 const name = document.getElementById('name-input').value.trim();
 const email = document.getElementById('email-input').value.trim();
 const pass = document.getElementById('pass-input').value.trim();
 const err = document.getElementById('cover-error');
 err.innerText = '';

 if(name.length < 3) { err.innerText = "Name must be 3+ letters"; return; }
 if(pass.length < 6) { err.innerText = "Password must be 6+ characters"; return; }

 try {
   const cred = await createUserWithEmailAndPassword(auth, email, pass);
   const nameSnap = await get(query(ref(db, 'users'), orderByChild('name'), equalTo(name)));
   if(nameSnap.exists()) { 
     await deleteUser(cred.user);
     err.innerText = "Name already taken!"; 
     return; 
   }
   await set(ref(db, 'users/' + cred.user.uid), { 
     name, 
     email, 
     color: colors[Math.floor(Math.random()*colors.length)] 
   });
 } catch(e) {
   console.log("FIREBASE ERROR:", e);
   err.innerText = e.message;
 }
}

// LOGIN
document.getElementById('login-btn').onclick = () => {
 const email = document.getElementById('email-input').value.trim();
 const pass = document.getElementById('pass-input').value.trim();
 const err = document.getElementById('cover-error');
 err.innerText = '';
 signInWithEmailAndPassword(auth, email, pass).catch(e => {
   console.log("LOGIN ERROR:", e);
   err.innerText = e.message;
 });
}

// LOGOUT
document.getElementById('logout-btn').onclick = () => signOut(auth);

// AUTH STATE CHANGE
onAuthStateChanged(auth, (user) => {
 if(user) {
   currentUser = user;
   document.getElementById('cover').style.display = 'none';
   document.getElementById('app').style.display = 'block';
   loadPosts();
   loadChat();
 } else {
   currentUser = null;
   document.getElementById('cover').style.display = 'flex';
   document.getElementById('app').style.display = 'none';
 }
});

// POST TEXT ONLY
document.getElementById('post-btn').onclick = async () => {
  const text = document.getElementById('post-text').value.trim();
  if(!text) return;
  
  try {
    await push(ref(db, 'posts'), {
      uid: currentUser.uid,
      text,
      timestamp: Date.now()
    });
    document.getElementById('post-text').value = '';
  } catch(e) {
    console.log("POST ERROR:", e);
  }
}

// LOAD POSTS
function loadPosts() {
  onChildAdded(query(ref(db, 'posts'), orderByChild('timestamp')), async (snap) => {
    const post = snap.val();
    const userSnap = await get(ref(db, 'users/' + post.uid));
    const user = userSnap.val();
    
    const postDiv = document.createElement('div');
    postDiv.style.cssText = `background:white;padding:12px;margin:10px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.1);`;
    postDiv.innerHTML = `<b style="color:${user.color}">${user.name}</b><p style="margin:5px 0;">${post.text}</p>`;
    document.getElementById('feed').prepend(postDiv);
  });
}

// GLOBAL CHAT
document.getElementById('send-chat').onclick = async () => {
  const text = document.getElementById('chat-input').value.trim();
  if(!text) return;
  
  await push(ref(db, 'globalChat'), {
    uid: currentUser.uid,
    text,
    timestamp: Date.now()
  });
  document.getElementById('chat-input').value = '';
}

// LOAD CHAT
function loadChat() {
  onChildAdded(query(ref(db, 'globalChat'), orderByChild('timestamp')), async (snap) => {
    const msg = snap.val();
    const userSnap = await get(ref(db, 'users/' + msg.uid));
    const user = userSnap.val();
    
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `margin:5px 0;`;
    msgDiv.innerHTML = `<b style="color:${user.color}">${user.name}:</b> ${msg.text}`;
    document.getElementById('global-chat').appendChild(msgDiv);
    document.getElementById('global-chat').scrollTop = document.getElementById('global-chat').scrollHeight;
  });
}