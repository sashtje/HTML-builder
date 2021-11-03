const fs = require("fs/promises");
const path = require("path");

let pathToCopyDir = path.join(__dirname, "files-copy");
let pathToDir = path.join(__dirname, "files");

async function copyDir() {
  await fs.mkdir(pathToCopyDir, { recursive: true });
  const files = await fs.readdir(pathToDir);
  files.forEach((item) => {
    fs.copyFile(path.join(pathToDir, item), path.join(pathToCopyDir, item));
  });

  const filesCopy = await fs.readdir(pathToCopyDir);
  filesCopy.forEach((item) => {
    if (!files.includes(item)) {
      fs.rm(path.join(pathToCopyDir, item));
    }
  });
}

copyDir();
