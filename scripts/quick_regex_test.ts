const tests = [
  /ir\s+a/i,
  /ir a/i,
  /ir\s+a\s+al\s+/i,
  /ir a al /i,
];
const input = "ir al centro";
for (const re of tests) {
  console.log(re.toString(), "on", JSON.stringify(input), "=>", input.match(re));
}
