const JSZip = require("jszip");
const { createWriteStream, readFileSync, mkdirSync, existsSync } = require("fs");
var { version } = require("../package.json");

const JS_FILE_NAME = "script.js";
const JS_FILE_PATH = `src/${JS_FILE_NAME}`;
const CSS_FILE_NAME = "style.css";
const CSS_FILE_PATH = `src/${CSS_FILE_NAME}`;
const README_FILE_NAME = `README.md`;
const README_FILE_PATH = `user-guide.md`;
const OUT_DIR = "publish";
const ZIP_FILE_PATH = `${OUT_DIR}/perfection-${version}.zip`;

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR);
}

new JSZip()
  .file(JS_FILE_NAME, String(readFileSync(JS_FILE_PATH)).replace("{{VERSION}}", version))
  .file(CSS_FILE_NAME, readFileSync(CSS_FILE_PATH))
  .file(README_FILE_NAME, readFileSync(README_FILE_PATH))
  .generateNodeStream({ type: "nodebuffer", streamFiles: true })
  .pipe(createWriteStream(ZIP_FILE_PATH))
  .on("finish", () => console.log(`${ZIP_FILE_PATH} file created.`));
