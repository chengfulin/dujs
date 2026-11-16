var o = {}, a = 1, x;
if (o.p) {
  x = 1;
}
if (o[a]) {
  x = 2;
}
if (x = a) {
  x = 3;
}
if (a++) {
  x = 4;
}
if (`${a}`) {
  x = 5;
}
