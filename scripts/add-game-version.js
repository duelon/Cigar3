const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

let version = 'v0.0.0'; // Default version if no Git tag is found

try {
    // Attempt to get the latest Git tag
    version = execSync('git describe --tags --abbrev=0').toString().trim();
} catch (error) {
    console.warn('No Git tags found. Using default version:', version);
}

// Path to your HTML file
const htmlPath = path.resolve(__dirname, '../web/index.html');

// Check if the HTML file exists
if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found at ${htmlPath}`);
    process.exit(1);
}

try {
    // Read the HTML file
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Regex to match `<div id="game-version">` regardless of whitespace or attributes
    const gameVersionRegex = /<div\s+id="game-version"[^>]*>(.*?)<\/div>/i;

    if (gameVersionRegex.test(htmlContent)) {
        // Replace the content inside the `id="game-version"` div
        htmlContent = htmlContent.replace(
            gameVersionRegex,
            `<div id="game-version" style="position: absolute;top:16px;right:16px">${version}</div>`
        );

        // Write the updated content back to the HTML file
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log(`Version ${version} added to the 'game-version' div in index.html`);
    } else {
        console.warn(`No element with id="game-version" found in index.html.`);
        console.log('HTML file content:\n', htmlContent); // Debugging: Log the content
    }
} catch (error) {
    console.error('Error reading or writing to index.html:', error.message);
    process.exit(1);
}
