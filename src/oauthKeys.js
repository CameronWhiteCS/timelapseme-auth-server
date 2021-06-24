const crypto = require('crypto');
const fs = require('fs');
const { parseJwk } = require('jose/jwk/parse');

const loadKeyFile = (filePath) => {

    return fs.readFileSync(filePath, async (err) => {
        if (err) {
            console.log('An error occurred while attempting to load TimeLapseMe\'s JWT public key. The process will now terminate.');
            console.error(err);
            process.exit(1);
        }
    });
}

/**
 * TODO: Periodically load from google's certificate endpoint and cache result rather than storing key file.
 */
const publicKeyGoogle = crypto.createPublicKey(loadKeyFile(process.cwd() + '/keys/' + 'googleOAuth.pub'));

const publicKeyTimelapseme = crypto.createPublicKey(loadKeyFile(process.env.JWT_PUBLIC_KEY_PATH));

const privateKeyTimelapseme = crypto.createPrivateKey(loadKeyFile(process.env.JWT_PRIVATE_KEY_PATH));

const publicKeyApple = crypto.createPublicKey(loadKeyFile(process.cwd() + '/keys/' + 'appleOAuth.pub'));


module.exports = { publicKeyGoogle, publicKeyTimelapseme, privateKeyTimelapseme, publicKeyApple };