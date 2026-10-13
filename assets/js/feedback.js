/* মতামত ফরম → Apps Script → গুগল শিট (ট্যাব: "মতামত") */
(function () {
  'use strict';
  var form = document.getElementById('feedbackForm');
  if (!form) return;
  var status = document.getElementById('fbStatus');
  var btn = document.getElementById('fbSubmit');
  var url = (window.SRIJON_CONFIG || {}).APPS_SCRIPT_URL;

  function show(cls, msg) { status.className = 'status ' + cls; status.textContent = msg; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = form.message.value.trim();
    if (form.website.value) return;                       // হানিপট
    if (msg.length < 5) { show('error', 'অনুগ্রহ করে আপনার মতামত লিখুন।'); form.message.focus(); return; }
    btn.disabled = true;
    show('info', 'পাঠানো হচ্ছে…');
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'feedback', name: form.name.value.trim(), contact: form.contact.value.trim(), message: msg, website: '' })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'failed');
      form.reset();
      show('ok', 'ধন্যবাদ! আপনার মতামত আমাদের কাছে পৌঁছেছে।');
    }).catch(function () {
      show('error', 'দুঃখিত, মতামত পাঠানো যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।');
    }).then(function () { btn.disabled = false; });
  });
})();
