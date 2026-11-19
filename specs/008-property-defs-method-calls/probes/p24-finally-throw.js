var x = 0;
function t() {
  throw x;
}
try {
  t();
  x = 1;
} finally {
  console.log(x);
}
console.log(x);
