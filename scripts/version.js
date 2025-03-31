import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(__dirname, '..', 'version.json');

function readVersion() {
    return JSON.parse(fs.readFileSync(versionFile, 'utf8'));
}

function writeVersion(data) {
    fs.writeFileSync(versionFile, JSON.stringify(data, null, 2));
}

function updateVersion(type) {
    const data = readVersion();
    const [major, minor, patch] = data.version.split('.').map(Number);

    switch (type) {
        case 'major':
            data.version = `${major + 1}.0.0`;
            break;
        case 'minor':
            data.version = `${major}.${minor + 1}.0`;
            break;
        case 'patch':
            data.version = `${major}.${minor}.${patch + 1}`;
            break;
    }

    data.lastBuildType = type;
    writeVersion(data);

    // Also update package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = data.version;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));

    // Update version in local storage for the app
    const versionStorePath = path.join(__dirname, '..', 'src', 'store', 'version-storage');
    if (fs.existsSync(versionStorePath)) {
        const versionStore = JSON.parse(fs.readFileSync(versionStorePath, 'utf8'));
        versionStore.state.version = data.version;
        versionStore.state.lastBuildType = type;
        fs.writeFileSync(versionStorePath, JSON.stringify(versionStore, null, 2));
    }

    return data.version;
}

const type = process.argv[2] || 'patch';
const newVersion = updateVersion(type);
console.log(`Version updated to ${newVersion}`);
