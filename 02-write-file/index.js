const fs = require("fs");
const path = require("path");
const { stdin, stdout } = process;

let pathToTheFile = path.join(__dirname, "text.txt");
const output = fs.createWriteStream(pathToTheFile);

stdout.write("Please, write your text here:\n");

stdin.on("data", (data) => {
  if (data.toString() === "exit\r\n") {
    process.exit();
  }

  output.write(data);
});

process.on("exit", () => stdout.write("Goodbye!"));
process.on("SIGINT", () => {
  process.exit();
});
