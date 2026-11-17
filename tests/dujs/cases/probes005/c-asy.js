var x = 0;
var p;
async function g() {
await p;
x = 1;
}
g();
console.log(x);
