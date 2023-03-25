#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const yargs = require("yargs")
const sharp = require('sharp')
const prompt = require('prompt-sync')({ sigint: true })
const cliProgress = require('cli-progress')




const options = yargs
	.usage("Usage: -f <folder/path>")
	.option("f", { alias: "folder", describe: "Your folder", type: "string", demandOption: true })
	.argv

const IMG_FOLDER = options.folder.replace(/\/$/, "") // Remove trailing /
const COPY_FOLDER = IMG_FOLDER + '_hq'
const RESIZE_SIZE = 2000
const RESIZE_QUALITY = 70
const MAX_SIZE = 500000

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
	const progressBar = new cliProgress.SingleBar({
		format: '{bar} | {percentage}% | {value}/{total} files processed',
		barCompleteChar: '\u2588',
		barIncompleteChar: '\u2591',
		clearOnComplete: true,
	}, files.length);
	progressBar.start(files.length)

	const resizeOperations = files.map((file) => resizeFile(file).then((res) => { progressBar.increment(); return res }))

	const results = await Promise.all(resizeOperations);
	progressBar.stop();
	console.log(generateTable(results));
}

async function resizeFile(file) {
	const filePath = file.path;
	try {
		// console.log(`Resizing ${filePath}...`);
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
			await fs.promises.writeFile(path.join(IMG_FOLDER, filePath), buffer)
			return { filePath, error: null };
		} catch (err) {
			await fs.promises.unlink(path.join(COPY_FOLDER, filePath));
			return { filePath, error: err };
		}
	} catch (err) {
		return { filePath, error: err };
	}
}


function generateTable(data) {
	// Calculate the maximum length of each column
	const maxFilePathLength = Math.max(...data.map(({ filePath }) => filePath.length));
	const maxResizedLength = 7
	const maxErrorLength = Math.max(...data.map(({ error }) => error ? error.message.length : 0));

	// Build the header row
	const filePathHeader = 'Filename'.padEnd(maxFilePathLength);
	const resizedHeader = 'Resized'.padEnd(maxResizedLength);
	const errorHeader = 'Error'.padEnd(maxErrorLength);
	const header = `| ${filePathHeader} | ${resizedHeader} | ${errorHeader} |`;

	// Build the divider row
	const filePathDivider = '-'.repeat(maxFilePathLength + 2);
	const resizedDivider = '-'.repeat(maxResizedLength + 2);
	const errorDivider = '-'.repeat(maxErrorLength + 2);
	const divider = `+${filePathDivider}+${resizedDivider}+${errorDivider}+`;

	// Build the data rows
	const rows = data.map(({ filePath, resized, error }) => {
		const resizedStr = (error ? 'No' : 'Yes').padEnd(maxResizedLength);
		const errorStr = error ? error.message.padEnd(maxErrorLength) : '';
		return `| ${filePath.padEnd(maxFilePathLength)} | ${resizedStr} | ${errorStr} |`;
	});

	// Combine everything into a single string
	return `${header}\n${divider}\n${rows.join('\n')}\n${divider}\n`;
}