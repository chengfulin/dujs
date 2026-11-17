function h() { return 1; }
try {
  h();
} catch (e) {
  e = 3;
  console.log(e);
}
function k() { return 2; }
k();
