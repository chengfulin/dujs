var n = 3;
function next() {
  n = n - 1;
  return n;
}
while (next() > 0) {
  console.log(n);
}
