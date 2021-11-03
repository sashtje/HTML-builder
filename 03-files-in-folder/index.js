const fs = require("fs/promises");
const path = require("path");

let pathToDir = path.join(__dirname, "secret-folder");

async function readDir() {
  try {
    let files = await fs.readdir(pathToDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        let arrFile = file.name.split(".");
        let pathToFile = path.join(__dirname, "secret-folder/", file.name);
        let stats = await fs.stat(pathToFile);
        console.log(`${arrFile[0]} - ${arrFile[1]} - ${stats.size / 1000}kb`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

readDir();
