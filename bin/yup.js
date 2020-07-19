#!/usr/bin/env node

const fs = require("fs");
const childProcess = require("child_process");

const chalk = require("chalk");

const [, , ...requestedPackages] = process.argv;

if (!requestedPackages.length) {
  console.error(
    `⚠️  No package specified. Try using with ${chalk.yellowBright(
      "yup package-name-1 [package-name-2]"
    )}`
  );
  process.exit(1);
}

function upgradePackages(packages = [], args = []) {
  return new Promise((resolve, reject) => {
    if (!packages.length) {
      return resolve(0);
    }

    const yarnUpgrade = childProcess.spawn("yarn", [
      "add",
      ...args,
      ...packages.map(package => `${package.name}@${package.version}`)
    ]);

    yarnUpgrade.stderr.on("data", data => {
      process.stderr.write(`  ${data.toString()}`);
    });

    yarnUpgrade.on("exit", code => {
      if (code === 0) {
        return resolve(code);
      } else {
        console.error(`⚠️  Child exited with code ${code}`);
        return reject(code);
      }
    });
  });
}

fs.readFile("package.json", "utf8", async (err, file) => {
  if (err) {
    console.error(
      "Encountered an error while trying to read package.json",
      err
    );
    process.exit(1);
  }

  const { dependencies = {}, devDependencies = {} } = JSON.parse(file) || {};
  const packagesToUpgrade = [];
  const devPackagesToUpgrade = [];
  requestedPackages.forEach(requestedPackage => {
    if (devDependencies[requestedPackage]) {
      devPackagesToUpgrade.push({
        name: requestedPackage,
        version: devDependencies[requestedPackage],
        type: "devDependency"
      });
    } else if (dependencies[requestedPackage]) {
      packagesToUpgrade.push({
        name: requestedPackage,
        version: dependencies[requestedPackage],
        type: "dependency"
      });
    } else {
      console.log(
        `⚠️  ${chalk.yellowBright(
          requestedPackage
        )} does not exist as a dependency in this package.json.`
      );
    }
  });

  try {
    const allPackagesToUpgrade = [
      ...devPackagesToUpgrade,
      ...packagesToUpgrade
    ];
    if (!allPackagesToUpgrade.length) {
      console.log("⚠️  Nothing to upgrade. Exiting.");
      process.exit(0);
    }

    // Log the message: "Upgrading n package(s)" followed by the list of packages to upgrade.
    console.log(
      `⏳  Upgrading ${allPackagesToUpgrade.length} package${
        allPackagesToUpgrade.length !== 1 ? "s" : ""
      }: ${allPackagesToUpgrade
        .map(
          package => `
  * ${chalk.blueBright(`${package.name}@${package.version} (${package.type})`)}`
        )
        .join("")}`
    );

    // Await response from the two upgrade processes.
    const upgrade1 = await upgradePackages(devPackagesToUpgrade, ["--dev"]);
    const upgrade2 = await upgradePackages(packagesToUpgrade);

    if (upgrade1 === 0 && upgrade2 === 0) {
      console.log(
        `✅  Package${
          allPackagesToUpgrade.length !== 1 ? "s" : ""
        } upgraded successfully`
      );
      process.exit(0);
    } else {
      console.error(`⚠️  Not all packages could be upgraded.`);
      process.exit(1);
    }
  } catch (ex) {
    console.error(
      "⚠️  yup encountered an error when trying to upgrade packages",
      ex
    );
  }
});
