var a = 1;
function p() {
  function r() {
    function c() { return a; }
    c();
  }
  r();
  a = 3;
  r();
}
p();
