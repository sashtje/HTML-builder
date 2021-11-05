const { count } = require("console");
const fs = require("fs");
const path = require("path");
const fsp = fs.promises;
const EventEmitter = require("events");
const emitter = new EventEmitter();

let countReady = 0;
let arrData = [];

function readFile(pathToCssFile, filesLength, i, fileName, dirName) {
  const stream = fs.createReadStream(pathToCssFile, "utf-8");

  stream.on("data", (chunk) => (arrData[i] += chunk));
  stream.on("end", () => {
    countReady++;

    if (countReady === filesLength) {
      emitter.emit("output", fileName, dirName);
    }
  });
}

emitter.once("output", (fileName, dirName) => {
  let pathToTheFile = path.join(dirName, "project-dist", fileName);
  const output = fs.createWriteStream(pathToTheFile);

  arrData.forEach((item) => {
    output.write(item);
  });
});

async function bundleFiles(fileName, dirName) {
  try {
    let pathToStylesDir = path.join(dirName, "styles");
    const files = await fsp.readdir(pathToStylesDir, {
      withFileTypes: true,
    });

    let arrCssFiles = [];

    for (let i = 0; i < files.length; i++) {
      if (files[i].isFile() && path.extname(files[i].name) === ".css") {
        arrCssFiles.push(files[i]);
      }
    }

    for (let i = 0; i < arrCssFiles.length; i++) {
      let pathToCssFile = path.join(dirName, "styles", arrCssFiles[i].name);

      arrData[i] = "";
      readFile(pathToCssFile, arrCssFiles.length, i, fileName, dirName);
    }
  } catch (err) {
    console.error(err);
  }
}

exports.bundleFiles = bundleFiles;

if (require.main === module) {
  bundleFiles("bundle.css", __dirname);
}
