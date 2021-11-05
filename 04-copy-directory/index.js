const fs = require("fs/promises");
const path = require("path");

let pathToCopyDir = path.join(__dirname, "files-copy");
let pathToDir = path.join(__dirname, "files");

async function deleteDir(pathToCopyDir) {
  try {
    let files = await fs.readdir(pathToCopyDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        await fs.rm(path.join(pathToCopyDir, file.name));
      } else {
        await deleteDir(path.join(pathToCopyDir, file.name));
      }
    }

    await fs.rmdir(pathToCopyDir);
  } catch (err) {
    return;
  }
}

async function copyAll(pathToCopyDir, pathToDir) {
  const files = await fs.readdir(pathToDir, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile()) {
      fs.copyFile(
        path.join(pathToDir, file.name),
        path.join(pathToCopyDir, file.name)
      );
    } else {
      //create directory
      let pathNewDir = path.join(pathToCopyDir, file.name);
      await fs.mkdir(pathNewDir, { recursive: true });
      //copy all contents
      await copyAll(pathNewDir, path.join(pathToDir, file.name));
    }
  }
}

async function copyDir(pathToCopyDir, pathToDir) {
  await deleteDir(pathToCopyDir);

  await fs.mkdir(pathToCopyDir, { recursive: true });

  await copyAll(pathToCopyDir, pathToDir);
}

exports.copyDir = copyDir;

if (require.main === module) {
  copyDir(pathToCopyDir, pathToDir);
}
