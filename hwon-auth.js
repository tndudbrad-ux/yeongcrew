/* 부비 계정 v1 — Firebase Google 로그인 */
(function(){
var CFG={apiKey:"AIzaSyCmz6mI6a8zPWQrsv4AKSTCGpxtdrwZ2Ow",authDomain:"hwon-ai.firebaseapp.com",projectId:"hwon-ai",appId:"1:5783272455:web:d5c9215d615894ee7abea2"};
function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
var ready=load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
 .then(function(){return load('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');})
 .then(function(){ if(!firebase.apps.length) firebase.initializeApp(CFG); return firebase.auth(); });
/* 네비에 로그인/마이 링크 삽입 */
var link=null;
(function(){
 var nav=document.querySelector('header nav, nav.gnb');
 if(!nav) return;
 link=document.createElement('a'); link.href='/account.html'; link.id='hwAuthLink'; link.textContent='로그인';
 nav.appendChild(link);
})();
ready.then(function(auth){
 auth.onAuthStateChanged(function(u){
  window.hwonUser=u||null;
  if(link) link.textContent = u ? '마이' : '로그인';
  document.dispatchEvent(new CustomEvent('hwon-auth',{detail:u||null}));
 });
}).catch(function(e){ console.warn('hwon-auth init fail', e); });
window.hwonAuth={
 ready:function(){return ready;},
 signInGoogle:function(){
  return ready.then(function(auth){
   var p=new firebase.auth.GoogleAuthProvider();
   return auth.signInWithPopup(p).catch(function(e){
    if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'||e.code==='auth/popup-closed-by-user'===false)){
     return auth.signInWithRedirect(p);
    }
    throw e;
   });
  });
 },
 signOut:function(){return ready.then(function(a){return a.signOut();});}
};
})();
