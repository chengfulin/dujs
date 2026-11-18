localStorage.a = 1;
function f() {
  let localStorage = {};
  localStorage.k = 2;
  console.log(localStorage);
}
f();
console.log(localStorage.k);
//// page
console.log(localStorage.k);
