var e = 1;
try {
  e = 2;
} catch {
  console.log(e);
}
try {
  e = 3;
} catch (e) {
  var e = 4;
  console.log(e);
}
console.log(e);
