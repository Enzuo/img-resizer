#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const yargs = require("yargs")
const sharp = require('sharp')
const prompt = require('prompt-sync')({ sigint: true })



const options = yargs
    .usage("Usage: -f <folder/path>")
    .option("f", { alias: "folder", describe: "Your folder", type: "string", demandOption: true })
    .argv

const IMG_FOLDER = options.folder.replace(/\/$/, "") // Remove trailing /
const COPY_FOLDER = IMG_FOLDER + '_hq'
const RESIZE_SIZE = 2000
const RESIZE_QUALITY = 70
const MAX_SIZE = 5000

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

let filesToResize = files.filter(f => f.size > MAX_SIZE && f.isImg)
console.log(`About to resize ${filesToResize.length} images files`)
console.log(`Located in : "${IMG_FOLDER}"`)
console.log(`Original copy in "${COPY_FOLDER}"`)
let answer = prompt(`Comfirm (y/n)`)
if (answer === 'y') {
    console.log("proceeding to resize...")
    resizeFiles(filesToResize)
}

function readDirectory(basePath, dirPath = '') {
    let dirContent = fs.readdirSync(path.join(basePath, dirPath), { withFileTypes: true })
    // console.log("read directory", dirPath, dirContent)

    let arr = []
    for (var i = 0; i < dirContent.length; i++) {
        let dirent = dirContent[i]
        let filePath = path.join(dirPath, dirent.name)
        if (dirent.isDirectory()) {
            let subArr = readDirectory(basePath, filePath)
            arr = arr.concat(subArr)
        }
        else {
            let stat = fs.statSync(path.join(basePath, filePath))
            // console.log(stat)
            let isImg = path.extname(filePath) === '.jpg' || path.extname(filePath) === '.jpeg' || path.extname(filePath) === '.JPG'
            arr.push({ path: filePath, size: stat.size, isImg })
        }
    }
    return arr
}


async function resizeFiles(files) {
	const resizeOperations = files.map((file) => {
		return async () => {
		  const filePath = file.path;
		  try {
			console.log(`Resizing ${filePath}...`);
			const buffer = await sharp(path.join(IMG_FOLDER, filePath), {
			  // Use `failOnError: false` to allow processing of images that are corrupt or have unsupported metadata
			  failOnError: false,
			})
			  .withMetadata()
			  .resize(RESIZE_SIZE, RESIZE_SIZE, {
				fit: sharp.fit.inside,
				withoutEnlargement: true,
			  })
			  .jpeg({
				quality: RESIZE_QUALITY,
			  })
			  .toBuffer();
			await fs.promises.mkdir(path.join(COPY_FOLDER, path.parse(filePath).dir), {
			  recursive: true,
			});
			await fs.promises.copyFile(
			  path.join(IMG_FOLDER, filePath),
			  path.join(COPY_FOLDER, filePath)
			);
			try {
			  await fs.promises.writeFile(path.join(IMG_FOLDER, filePath), buffer);
			  console.log(`Resized ${filePath} successfully.`);
			} catch (err) {
			  console.error(`Could not write resized file ${filePath}: ${err.message}`);
			  await fs.promises.unlink(path.join(COPY_FOLDER, filePath));
			}
		  } catch (err) {
			console.error(`Could not resize ${filePath}: ${err.message}`);
		  }
		};
	  });
	
	  for (const operation of resizeOperations) {
		await operation();
	  }
  }