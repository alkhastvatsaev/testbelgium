const { JSDOM } = require("jsdom");
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.addEventListener("error", (event) => {
  console.error("DOM ERROR:", event.error);
});

setTimeout(() => {
  console.log("Finished waiting");
}, 2000);
