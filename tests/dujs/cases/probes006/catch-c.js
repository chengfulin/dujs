var e = 1;
try {
  e = 2;
} catch ({message}) {
  console.log(message);
}
try { e = 4; } catch (err) { console.log(err); }
