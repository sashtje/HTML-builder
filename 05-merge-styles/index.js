const { count } = require("console");
const fs = require("fs");
const path = require("path");
const fsp = fs.promises;
const EventEmitter = require("events");
const emitter = new EventEmitter();

let pathToTheFile = path.join(__dirname, "project-dist", "bundle.css");
const output = fs.createWriteStream(pathToTheFile);

let pathToStylesDir = path.join(__dirname, "styles");

let countReady = 0;
let arrData = [];

function readFile(pathToCssFile, filesLength, i) {
  const stream = fs.createReadStream(pathToCssFile, "utf-8");

  stream.on("data", (chunk) => (arrData[i] += chunk));
  stream.on("end", () => {
    countReady++;

    if (countReady === filesLength) {
      emitter.emit("output");
    }
  });
}

emitter.once("output", () => {
  arrData.forEach((item) => {
    output.write(item);
  });
});

async function bundleFiles() {
  try {
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
      let pathToCssFile = path.join(__dirname, "styles", arrCssFiles[i].name);

      arrData[i] = "";
      readFile(pathToCssFile, arrCssFiles.length, i);
    }
  } catch (err) {
    console.error(err);
  }
}

bundleFiles();
