function outer(p) {
  var a = 1;
  function k() { eval("x"); return a; }
  k();
  return a + p;
}
outer(2);
