const fs = require("fs");
const path = "src/components/TodaysAgenda.jsx";
let text = fs.readFileSync(path, "utf8");
const pattern = /\n\s*<div className="block-card-header">[\s\S]*?\n\s*\n\s*\{editingBlock && \(/;
let newText = text.replace(pattern, "\n      {editingBlock && (");
if (newText === text) { console.error("no match"); process.exit(1); }
fs.writeFileSync(path, newText, "utf8");
console.log("updated");
