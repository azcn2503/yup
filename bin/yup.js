#!/usr/bin/env node

const fs = require("fs");
const childProcess = require("child_process");

const chalk = require("chalk");

const requestedPackage = process.argv[2];

if (!requestedPackage) {
  console.error(
    `⚠️  No package specified. Try using with ${chalk.yellowBright(
      "yup package-name"
    )}`
  );
  process.exit(1);
}

fs.readFile("package.json", "utf8", (err, file) => {
  if (err) {
    console.error(
      "Encountered an error while trying to read package.json",
      err
    );
    process.exit(1);
  }

  const packageJson = JSON.parse(file);
  const yarnArgs = ["add"];
  if (
    packageJson.devDependencies &&
    packageJson.devDependencies[requestedPackage]
  ) {
    yarnArgs.push("--dev");
    yarnArgs.push(packageJson.devDependencies[requestedPackage]);
  } else if (
    packageJson.dependencies &&
    packageJson.dependencies[requestedPackage]
  ) {
    yarnArgs.push(packageJson.dependencies[requestedPackage]);
  }

  if (yarnArgs.length > 1) {
    const requestedVersion = yarnArgs[yarnArgs.length - 1];
    const yarnUpgrade = childProcess.spawn("yarn", yarnArgs);
    console.log(
      `⏳  upgrading ${chalk.blueBright(
        requestedPackage
      )} to ${chalk.blueBright(requestedVersion)}`
    );
    yarnUpgrade.stderr.on("data", data => {
      process.stderr.write(`  ${data.toString()}`);
    });
    yarnUpgrade.on("exit", code => {
      if (code === 0) {
        console.log(
          `✅  ${chalk.greenBright(
            requestedPackage
          )} upgraded successfully to ${chalk.greenBright(requestedVersion)}`
        );
      } else {
        console.error(`⚠️  Child exited with code ${code}`);
      }
      process.exit(code);
    });
  } else {
    console.error(`⚠️  Could not find package: ${requestedPackage}`);
    process.exit(1);
  }
});
