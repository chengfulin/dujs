let r = 0;
while (r < 9) {
try {
r = 1;
break;
} finally {
r = 3;
}
}
console.log(r);
