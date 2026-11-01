(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(s) { return String(s).replace(/\d/g, function (d) { return BN[d]; }); }
  var ids = ['rNo', 'rDate', 'rType', 'rMemNo', 'rName', 'rKind', 'rAmount', 'rWords', 'rMethod'];

  function show(id) {
    var v = $(id).value || '';
    if (id === 'rDate' && v) { var q = v.split('-'); v = bn(q[2] + '/' + q[1] + '/' + q[0]); }
    if (id === 'rAmount' && v) v = bn(v) + ' টাকা';
    Array.prototype.forEach.call(document.querySelectorAll('.mir[data-for="' + id + '"]'), function (o) { o.textContent = v; });
  }
  function today() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  ids.forEach(function (id) {
    ['input', 'change'].forEach(function (ev) { $(id).addEventListener(ev, function () { show(id); }); });
  });
  $('rDate').value = today(); ids.forEach(show);
  $('rPrint').addEventListener('click', function () { window.print(); });
  $('rClear').addEventListener('click', function () {
    ids.forEach(function (id) { $(id).value = id === 'rDate' ? today() : ''; show(id); });
  });
})();
