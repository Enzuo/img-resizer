#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const yargs = require("yargs")
const sharp = require('sharp')
const prompt = require('prompt-sync')({sigint: true})



const options = yargs
 .usage("Usage: -f <folder/path>")
 .option("f", { alias: "folder", describe: "Your folder", type: "string", demandOption: true })
 .argv

const IMG_FOLDER = options.folder
console.log(`Looking for images to resize in folder : ${IMG_FOLDER}`)



// listImagesFiles()
// async function listImagesFiles() {
//     const globPath = IMG_FOLDER+'/**/*.{jpg,jpeg}'// path.join(IMG_FOLDER, '/**/*.{jpg,jpeg}')
//     console.log(globPath)
//     const files = await glob(globPath, { ignore: 'node_modules/**', stat: false, withFileTypes: true })
//     console.log(files)
// }

let files = readDirectory(IMG_FOLDER)
console.log(`I found those ${files.length} files`, files)

const MAX_SIZE = 500000
let filesToResize = files.filter(f => f.size > MAX_SIZE)
let answer = prompt(`should I resize ${filesToResize.length} files (y/n)`)
if(answer === 'y') {
    console.log("proceeding to resize...")
    resizeFiles(filesToResize)
}

function readDirectory(dirPath){
    let dirContent = fs.readdirSync(dirPath, {withFileTypes : true})
    // console.log("read directory", dirPath, dirContent)

    let arr = []
    for(var i=0; i<dirContent.length; i++){
        let dirent = dirContent[i]
        let fullpath = path.join(dirPath, dirent.name)
        if(dirent.isDirectory()){
            let subArr = readDirectory(fullpath)
            arr = arr.concat(subArr)
        }
        else {
            let stat = fs.statSync(fullpath)
            // console.log(stat)
            arr.push({path : fullpath, size : stat.size, })
        }
    } 
    return arr
}


async function resizeFiles(files){
    for(var i=0; i<files.length; i++){
        let file = files[i]
        let filePath = file.path

        console.log("resizing", filePath)
        await sharp(filePath)
        .withMetadata()
        .resize(2000, 2000, {
            fit: sharp.fit.inside,
            withoutEnlargement: true,
        })
        .jpeg({
            quality: 70,
        })
        .toBuffer(function(err, buffer) {
            fs.writeFile(filePath, buffer, function(e) {
        
            });
        });
    }
}