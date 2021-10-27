#!/usr/bin/env node

const fs = require("fs");
const { EOL } = require("os");
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

async function backupFiles() {
  process.stdout.write("💾  Backing up files...");
  await Promise.all([
    copyFile("package.json", ".package.json.yup-backup"),
    copyFile("yarn.lock", ".yarn.lock.yup-backup")
  ]);
  process.stdout.write(" Done!" + EOL);
  return;
}

async function removePackages(packages = [], args = []) {
  return await new Promise((resolve, reject) => {
    if (!packages.length) return resolve(0);
    let err = "";
    const yarnRemove = childProcess.spawn("yarn", [
      "remove",
      ...packages.map(({ name }) => name)
    ]);
    yarnRemove.stderr.on("data", data => {
      err += data.toString();
    });
    yarnRemove.on("exit", code => {
      if (code === 0) return resolve(code);
      console.log(`⚠️  Child exited with code ${code}`);
      console.error(err);
      return reject(code);
    });
  });
}

async function upgradePackages(packages = [], args = []) {
  return new Promise((resolve, reject) => {
    if (!packages.length) return resolve(0);
    let err = "";
    const yarnUpgrade = childProcess.spawn("yarn", [
      "add",
      ...args,
      ...packages.map(package => `${package.name}@${package.version}`)
    ]);
    yarnUpgrade.stderr.on("data", data => {
      err += data.toString();
    });
    yarnUpgrade.on("exit", code => {
      if (code === 0) return resolve(code);
      console.error(`⚠️  Child exited with code ${code}`);
      console.error(err);
      return reject(code);
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

  await backupFiles();

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

    console.log(
      `🗑  Removing ${allPackagesToUpgrade.length} package${
        allPackagesToUpgrade.length !== 1 ? "s" : ""
      }: ${allPackagesToUpgrade
        .map(({ name }) => `${EOL}  * ${chalk.blueBright(name)}`)
        .join("")}`
    );

    // Remove the packages
    await removePackages(allPackagesToUpgrade);

    // Log the message: "Upgrading n package(s)" followed by the list of packages to upgrade.
    console.log(
      `⏳  Upgrading ${allPackagesToUpgrade.length} package${
        allPackagesToUpgrade.length !== 1 ? "s" : ""
      }: ${allPackagesToUpgrade
        .map(
          ({ name, version, type }) =>
            `${EOL}  * ${chalk.blueBright(`${name}@${version} (${type})`)}`
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
      await removeFiles();
      process.exit(0);
    } else {
      console.error(`⚠️  Not all packages could be upgraded.`);
      await restoreFiles();
      process.exit(1);
    }
  } catch (ex) {
    console.error(
      "⚠️  yup encountered an error when trying to upgrade packages",
      ex
    );
    await restoreFiles();
    process.exit(1);
  }
});

async function copyFile(source, target) {
  return await new Promise((resolve, reject) => {
    const copy = childProcess.spawn("cp", [source, target]);
    copy.stderr.on("data", data => process.stderr.write(`  ${data}`));
    copy.on("exit", code => {
      if (code === 0) return resolve(code);
      return reject(code);
    });
  });
}

async function restoreFile(source, target) {
  return await new Promise((resolve, reject) => {
    const mv = childProcess.spawn("mv", [source, target]);
    mv.stderr.on("data", data => process.stderr.write(`  ${data}`));
    mv.on("close", code => {
      if (code === 0) return resolve(code);
      return reject(code);
    });
  });
}

async function removeFile(path) {
  return await new Promise((resolve, reject) => {
    const rm = childProcess.spawn("rm", [path]);
    rm.stderr.on("data", data => process.stderr.write(`  ${data}`));
    rm.on("close", code => {
      if (code === 0) return resolve(code);
      return reject(code);
    });
  });
}

async function restoreFiles() {
  process.stdout.write("🙌  Restoring files...");
  await Promise.all([
    restoreFile(".package.json.yup-backup", "package.json"),
    restoreFile(".yarn.lock.yup-backup", "yarn.lock")
  ]);
  process.stdout.write(" Done!" + EOL);
  return;
}

async function removeFiles() {
  return await Promise.all([
    removeFile(".package.json.yup-backup"),
    removeFile(".yarn.lock.yup-backup")
  ]);
}

process.on("SIGINT", async () => {
  console.log(EOL + "Caught interupt signal, restoring files and quitting.");
  await restoreFiles();
  process.exit(0);
});
