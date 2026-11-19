let opened = false;
function openMyFile() {
opened = true;
}
function writeMyFile(data) {
console.log(data);
}
function closeMyFile() {
opened = false;
}
function handleError(e) {
console.error(e);
}
openMyFile();
try {
writeMyFile(opened);
} catch (e) {
handleError(e);
} finally {
closeMyFile();
}
console.log(opened);
