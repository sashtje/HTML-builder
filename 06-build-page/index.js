const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const EventEmitter = require("events");
const emitter = new EventEmitter();
const moduleCopyDir = require("../04-copy-directory/index");
const moduleMergeStyles = require("../05-merge-styles/index");

//directories
const PROJECT_DIST = "project-dist";
const COMPONENTS = "components";
const ASSETS = "assets";

//files for reading
const TEMPLATE_HTML = "template.html";

//files for writing
const INDEX_HTML = "index.html";

//create index.html
const outputIndexHTML = fs.createWriteStream(
  getAbsolutePath([PROJECT_DIST, INDEX_HTML])
);

const data = {};

async function readDir(pathToDir, ext) {
  try {
    let files = await fsp.readdir(pathToDir, { withFileTypes: true });
    if (ext === undefined) return files;

    let arrFilesExt = [];
    for (const file of files) {
      if (file.isFile() && path.extname(file.name) === ".html") {
        arrFilesExt.push(file);
      }
    }

    return arrFilesExt;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function writeIndexHTML(arrTags) {
  //there are no tags
  if (arrTags.length === 0) {
    outputIndexHTML.write(data[TEMPLATE_HTML]);
    emitter.emit("html file is ready");
  } else {
    //get arr of html files located in components dir
    const htmlFiles = await readDir(getAbsolutePath(["components"]), ".html");

    let numberFilesToRead = { value: 0 };
    let arrFilesToRead = [];

    for (const file of htmlFiles) {
      if (arrTags.includes(`{{${file.name.split(".")[0]}}}`)) {
        arrFilesToRead.push(file);
        numberFilesToRead.value++;
      }
    }

    // readFile(path, fileName, event, numberFiles);
    for (const file of arrFilesToRead) {
      readFile(
        getAbsolutePath([COMPONENTS, file.name]),
        file.name,
        "finished reading components",
        numberFilesToRead,
        arrTags
      );
    }
  }
}

function getAbsolutePath(partPath) {
  return path.join(__dirname, ...partPath);
}

async function makeNewDir(pathToNewDir) {
  await fsp.mkdir(pathToNewDir, { recursive: true });
}

async function readFile(path, fileName, event, numberFiles, params) {
  const stream = fs.createReadStream(path, "utf-8");
  data[fileName] = "";

  stream.on("data", (chunk) => (data[fileName] += chunk));
  stream.on("end", () => {
    if (numberFiles === undefined) emitter.emit(event);
    else {
      numberFiles.value--;
      if (numberFiles.value === 0) {
        emitter.emit(event, params);
      }
    }
  });
}

async function buildIndexHtml() {
  //create project-dist dir
  await makeNewDir(getAbsolutePath([PROJECT_DIST]));

  //read template.html
  await readFile(
    getAbsolutePath([TEMPLATE_HTML]),
    TEMPLATE_HTML,
    `finished reading ${TEMPLATE_HTML}`
  );
}

buildIndexHtml();

//some our own events
emitter.once("finished reading template.html", () => {
  //find all tags
  let regexp = /{{.+?}}/g;
  let arrTags = data[TEMPLATE_HTML].match(regexp);

  writeIndexHTML(arrTags);
});

emitter.once("finished reading components", (arrTags) => {
  arrTags.forEach((tag) => {
    let arrParts = data[TEMPLATE_HTML].split(tag);
    let fileWithTag = data[tag.slice(2, -2) + ".html"];
    data[TEMPLATE_HTML] = arrParts[0] + fileWithTag + arrParts[1];
    delete data[tag.slice(2, -2) + ".html"];
  });

  outputIndexHTML.write(data[TEMPLATE_HTML]);
  delete data[TEMPLATE_HTML];

  emitter.emit("html file is ready");
});

emitter.once("html file is ready", () => {
  //copy assets dir to project-dist/assets
  let pathToCopyDir = getAbsolutePath([PROJECT_DIST, ASSETS]);
  let pathToDir = getAbsolutePath([ASSETS]);
  moduleCopyDir.copyDir(pathToCopyDir, pathToDir);

  //create style.css
  moduleMergeStyles.bundleFiles("style.css", __dirname);
});
