(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  var ids = ['rNo', 'rDate', 'rMemNo', 'rName', 'rPhone', 'rPeriod', 'rAmount', 'rWords', 'rMethod', 'rNote'];

  function show(id) {
    var el = $(id), v = el.value || '';
    if (id === 'rDate' && v) { var q = v.split('-'); v = bn(q[2] + '/' + q[1] + '/' + q[0]); }
    if (id === 'rAmount' && v) v = bn(v) + ' টাকা';
    var out = document.querySelectorAll('.mir[data-for="' + id + '"]');
    Array.prototype.forEach.call(out, function (o) { o.textContent = v; });
  }
  function today() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  ids.forEach(function (id) {
    var el = $(id);
    ['input', 'change'].forEach(function (ev) { el.addEventListener(ev, function () { show(id); }); });
  });
  $('rDate').value = today(); ids.forEach(show);
  $('rPrint').addEventListener('click', function () { window.print(); });
  $('rClear').addEventListener('click', function () {
    ids.forEach(function (id) { var el = $(id); el.value = id === 'rDate' ? today() : (el.tagName === 'SELECT' ? el.options[0].value : ''); show(id); });
  });
})();
