var a = 1;
function p() {
  function r() {
    function c() { return a; }
    c();
  }
  r();
}
p();
a = 2;
p();
