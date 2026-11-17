var x = 0;
let f = function () { x = 7; };
function a() {
x = 1;
f();
console.log(x);
}
a();
