#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const yargs = require("yargs")


const options = yargs
 .usage("Usage: -f <folder/path>")
 .option("f", { alias: "folder", describe: "Your folder", type: "string", demandOption: true })
 .argv

const greeting = `Looking for images to resize in folder : ${options.folder}`

fs.readdir(options.folder, {withFileTypes : true}, (err, files) => {
    console.log(files)
})

console.log(greeting)
