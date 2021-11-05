const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const EventEmitter = require("events");
const emitter = new EventEmitter();

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
let countReady = 0;
let arrData = [];

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

    for (const file of arrFilesToRead) {
      readFileBundle(
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

async function readFileBundle(path, fileName, event, numberFiles, params) {
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
  await readFileBundle(
    getAbsolutePath([TEMPLATE_HTML]),
    TEMPLATE_HTML,
    `finished reading ${TEMPLATE_HTML}`
  );
}

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
  copyDir(pathToCopyDir, pathToDir);

  //create style.css
  bundleFiles("style.css", __dirname);
});

async function deleteDir(pathToCopyDir) {
  try {
    let files = await fsp.readdir(pathToCopyDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        await fsp.rm(path.join(pathToCopyDir, file.name));
      } else {
        await deleteDir(path.join(pathToCopyDir, file.name));
      }
    }

    await fsp.rmdir(pathToCopyDir);
  } catch (err) {
    return;
  }
}

async function copyAll(pathToCopyDir, pathToDir) {
  const files = await fsp.readdir(pathToDir, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile()) {
      fsp.copyFile(
        path.join(pathToDir, file.name),
        path.join(pathToCopyDir, file.name)
      );
    } else {
      //create directory
      let pathNewDir = path.join(pathToCopyDir, file.name);
      await fsp.mkdir(pathNewDir, { recursive: true });
      //copy all contents
      await copyAll(pathNewDir, path.join(pathToDir, file.name));
    }
  }
}

async function copyDir(pathToCopyDir, pathToDir) {
  await deleteDir(pathToCopyDir);

  await fsp.mkdir(pathToCopyDir, { recursive: true });

  await copyAll(pathToCopyDir, pathToDir);
}

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
    output.write(item + "\n");
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

buildIndexHtml();
