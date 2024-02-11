import { Client, IntentsBitField } from "discord.js";
import * as pdfjsLib from "pdfjs-dist";

let PDF_URL;

//Guilds are servers, this is giving Nanachi the permissions she needs
const knittingFren = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

//Nanachi wake up~
knittingFren.login(
	
);

//Nanachi watching all the messages that come in for an attachment
knittingFren.on("messageCreate", (message) => {
	if (message.author.bot) return;
	if (message.attachments.size === 0) return;

	message.attachments.forEach((attachment) => {
		//Safeguard Nanachi from anything not PDF
		if (attachment.contentType !== "application/pdf") return;

		//Set the global to the attachment we're working with
		PDF_URL = attachment;
		extractTextFromPDF(PDF_URL)
			.then((text) => {
				//Formatting the text to be an array to be consumed
				let textArray = textToTextArray(text);
				//Calling the parent function that calls the extractors
				const stats = respondWithStats(textArray).then((stats) =>
					message.reply(stats)
				);
			})
			.catch((error) => {
				message.reply("This failed, I'm sorry, the error was:", error);
			});
	});
});

function textToTextArray(text) {
	text = text.toLowerCase();
	let textArray = text.split(" ");
	const puncutationRegex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~•©]/g;
	textArray = textArray.filter(
		(text) =>
			!text.match(puncutationRegex) &&
			text !== "" &&
			text !== "row" &&
			text !== "stitches" &&
			text !== "repeat"
	);
	return textArray;
}

function extractTextFromPDF(PDF_URL) {
	return new Promise((resolve, reject) => {
		// Loading document
		const loadingTask = pdfjsLib.getDocument(PDF_URL);

		loadingTask.promise.then(
			function (pdf) {
				// Array to hold text from each page
				const textArray = [];

				// Iterate through each page
				const numPages = pdf.numPages;
				let countPromises = []; // Promises to load all pages
				for (let pageNum = 1; pageNum <= numPages; pageNum++) {
					let page = pdf.getPage(pageNum);
					countPromises.push(
						page
							.then((page) => {
								// Text content from page
								return page.getTextContent();
							})
							.then((textContent) => {
								// Extracting text from text content
								let pageText = "";
								textContent.items.forEach(function (textItem) {
									pageText += textItem.str + " ";
								});
								textArray.push(pageText);
							})
					);
				}

				// Wait for all pages to be loaded
				Promise.all(countPromises).then(function () {
					resolve(textArray.join("\n")); // Joining text from all pages
				});
			},
			function (reason) {
				reject(reason);
			}
		);
	});
}
//The parent function to call all the extractors. Intakes the textArray made by /its/ parent
async function respondWithStats(textArray) {
	let cable = extractCable(textArray);
	let yarnWeight = extractYarnWeight(textArray);
	let dpn = extractDpn(textArray);
	let product = extractProduct(textArray);
	let title = extractTitle();

	let needleSize = extractNeedleSize(textArray);
	return `This knitting pattern is: Title: ${title} | Product: ${product} | Needle Size: ${needleSize.toString()} | Cables: ${cable} | DPNs: ${dpn} | Yarn Weight: ${yarnWeight}`;
}

function extractTitle() {
	const regex = /[_|.\-]|\b\b/g;
	let tempTitle = PDF_URL.name.replace(regex, " ");
	const regexPdf = /\b(pdf|web)\b/gi;
	let title = tempTitle.replace(regexPdf, "");
	return title;
}

function extractProduct(textArray) {
	let product = {
		Hat: 0,
		Scarf: 0,
		Blanket: 0,
		Socks: 0,
		Gloves: 0,
		Sweater: 0,
	};
	for (let word of textArray) {
		switch (word) {
			case "toque":
				product.Hat++;
				break;
			case "hat":
				product.Hat++;
				break;
			case "scarf":
				product.Scarf++;
				break;
			case "blanket":
				product.Blanket++;
				break;
			case "sock":
				product.Socks++;
				break;
			case "socks":
				product.Socks++;
				break;
			case "gloves":
				product.Gloves++;
				break;
			case "glove":
				product.Gloves++;
				break;
			case "sweater":
				product.Sweater++;
				break;
		}
	}
	let max = Object.entries(product).reduce(
		(max, entry) => (entry[1] >= max[1] ? entry : max),
		[0, -Infinity]
	);
	//Nothing is logged
	if (max[1] === 0) return "Unknown";
	return max[0];
}

function extractNeedleSize(textArray) {
	const regexSIZES = /size/;
	const regexUS = /us/;
	let needleSizes = [];
	for (let i = 0; i < textArray.length; i++) {
		if (regexUS.test(textArray[i])) {
			//There ios an argument to extend this if chekc to check surrounding places for a number instead of the heard coded one or two, this can be inmpimented if there are a lot of problems with finding the size
			if (textArray[i + 1].match(/\d+/g)) {
				const size = textArray[i].toUpperCase() + " " + textArray[i + 1];
				needleSizes.push(size);
			}
			if (textArray[i + 1].match("size")) {
				const size =
					textArray[i].toUpperCase() +
					" " +
					textArray[i + 1] +
					" " +
					textArray[i + 2];
				needleSizes.push(size);
			}
		} else if (regexSIZES.test(textArray[i])) {
			if (textArray[i + 1].match(/\d+/g)) {
				const size = textArray[i] + " " + textArray[i + 1];
				needleSizes.push(size);
			}
		}
	}
	return needleSizes;
}

function extractDpn(textArray) {
	let words = ["dpn", "dpns", "double pointed needles", "double pointed"];
	for (let word of words) {
		if (textArray.includes(word)) return true;
	}
	return false;
}

function extractYarnWeight(textArray) {
	let weight = {
		//Category 0
		Lace: 0,
		//Category 1
		Super_Fine: 0,
		//Category 2
		Fine: 0,
		//Category 3
		Light: 0,
		//Category 4
		Medium: 0,
		//Category 5
		Bulky: 0,
		//Category 6
		Super_Bulky: 0,
		//Category 7
		Jumbo: 0,
	};
	for (let word of textArray) {
		switch (word) {
			//Category 0
			case "ultra fine":
				weight.Lace++;
				break;
			case "lace":
				weight.Lace++;
				break;

			//Category 1
			case "super fine":
				weight.Super_Fine++;
				break;
			case "fingering":
				weight.Super_Fine++;
				break;
			case "sock":
				weight.Super_Fine++;
				break;

			//Category 2
			case "fine":
				weight.Fine++;
				break;
			case "sport":
				weight.Fine++;
				break;
			case "baby":
				weight.Fine++;
				break;

			//Category 3
			case "light":
				weight.Light++;
				break;
			case "dk":
				weight.Light++;
				break;
			case "worsted":
				weight.Light++;
				break;

			//Category 4
			case "medium":
				weight.Medium++;
				break;
			case "afghan":
				weight.Medium++;
				break;
			case "aran":
				weight.Medium++;
				break;

			//Category 5
			case "bulky":
				weight.Bulky++;
				break;
			case "chunky":
				weight.Bulky++;
				break;
			case "rug":
				weight.Bulky++;
				break;

			//Category 6
			case "super bulky":
				weight.Super_Bulky++;
				break;
			case "roving":
				weight.Super_Bulky++;
				break;
		}
	}
	let max = Object.entries(weight).reduce(
		(max, entry) => (entry[1] >= max[1] ? entry : max),
		[0, -Infinity]
	);

	//Nothing is written
	if (max[1] === 0) return "Unknown";
	//Changing the format of the data to send to nicely
	if (max[0] === "Super_Bulky") return "Super Bulky";
	if (max[0] === "Super_Fine") return "Super Fine";
	return max[0];
}

function extractCable(textArray) {
	let words = ["cable", "cables"];
	for (let word of words) {
		if (textArray.includes(word)) return true;
	}
	return false;
}

// function extractTitle(text) {
// 	const lines = text.split("\n");
// 	let potentialTitles = [];

// 	for (let i = 0; i < lines.length; i++) {
// 		console.log("POT TITLES:", potentialTitles);
// 		const line = lines[i].trim();

// 		// Check if line starts with a capitalized word
// 		if (/^[A-Z][a-z]*\b/.test(line)) {
// 			// Cap the title at 15 characters
// 			const cappedTitle = line.substring(0, 5000);
// 			potentialTitles.push(cappedTitle);
// 		} else if (/^[A-Z]*\b/.test(line)) {
// 			// Cap the title at 15 characters
// 			const cappedTitle = line.substring(0, 5000);
// 			potentialTitles.push(cappedTitle);
// 		} else if (line === "") {
// 			// If encountering an empty line, check the next line for a potential title
// 			const nextLine = lines[i + 1];
// 			if (nextLine && /^[A-Z][a-z]*\b/.test(nextLine.trim())) {
// 				potentialTitles.push(nextLine.trim());
// 			}
// 		}
// 	}
// 	//Pull out commonly missed phrases
// 	// for(let title of potentialTitles){
// 	//   if(title === "")
// 	// }

// 	// If we found potential titles, return the first one
// 	if (potentialTitles.length > 0) {
// 		return potentialTitles[0];
// 	} else {
// 		//Turns the file name into the title if no title exists
// 		const regexPdf = /\.pdf\b/g;
// 		let text2 = PDF_URL.name.replace(regexPdf, "");
// 		let finalString = text2.replace(/_/g, " ");
// 		return finalString;
// 	}
// }
