const yup = require('yup');
const { Sequelize } = require('sequelize');
const secureRandom = require('secure-random');
const bcrypt = require('bcrypt');
const { SignJWT } = require('jose/jwt/sign')
const { jwtVerify } = require('jose/jwt/verify');

const { privateKeyTimelapseme, publicKeyGoogle, publicKeyApple } = require('src/oauthKeys.js');
const { User, RefreshToken, sequelize } = require('src/models');

const SALT_ROUNDS = 10;
const GENERIC_SIGNUP_ERROR = 'An error occurred while attempting to create a new user.';

/**
 * Generates a JWT for for the user with the specified ID.
 * @param {Integer} userId 
 * @returns {Promise<String>} String representation of the JWT
 */
const generateJwt = (userId) => {

    return new SignJWT({ userId: userId })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(process.env.JWT_ISSUER)
        .setAudience(process.env.JWT_AUDIENCE)
        .setExpirationTime('15m')
        .sign(privateKeyTimelapseme);

}

/**
 * Generates a cryptographically secure refresh token
 * @param {*} transaction 
 * @returns {Promise<RefreshToken>}
 */
const generateRefreshToken = (transaction) => {
    return RefreshToken.create({
        value: secureRandom(128, { type: 'Buffer' }).toString('base64')
    }, { transaction });
}

/**
 * Checks to see if a user with the provided email address and authentication method already has an account.
 * @param {String} email 
 * @param {String} authenticationMethod as defined in User.authenticationMethod 
 * @returns {Bool} True if the provided user already has an account (or an error occurs during lookup), false otherwise.
 */
const userAlreadyExists = async (email, authenticationMethod) => {

    try {

        const numUsers = await User.findAndCountAll({
            where: {
                email: Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('email')),
                    Sequelize.fn('lower', email)
                ),
                authenticationMethod
            }
        });

        return numUsers.count > 0;

    } catch (err) {
        console.error(err);
        return true;
    }
}

/**
 * Creates a new user and stores it in the database.
 * 
 * If an account with the same email address (case insensitive)
 * and authentication method is found, an error will be thrown.
 * @param {*} req Express request object. 
 * @param {*} res Express response object.
 * @param {String} email 
 * @param {String} authenticationMethod Enum as defined in User.authenticationMethod
 * @param {String} [password=null] 
 */
const createNewUser = async ({req, res, email, authenticationMethod, password, nickname}) => {

    try {

        if (await userAlreadyExists(email, authenticationMethod)) {
            res.status(400).send('That email address is currently unavailable using that authentication method.');
            return;
        }

        let passwordHash = (password === undefined || password === null) ? null : bcrypt.hashSync(req.body.password, SALT_ROUNDS);

        const transaction = await sequelize.transaction();

        const newUser = await User.create({
            email: email.toLowerCase(),
            passwordHash: passwordHash,
            authenticationMethod: authenticationMethod,
            nickname: nickname
        }, { transaction });

        const refreshToken = await generateRefreshToken(transaction);

        await newUser.addRefreshToken(refreshToken, { transaction: transaction });

        const jwt = await generateJwt(newUser.id);

        await transaction.commit();

        res.status(200).json({
            accessToken: jwt,
            refreshToken: refreshToken.value
        });

    } catch (err) {
        console.error(err);
        res.status(400).send(GENERIC_SIGNUP_ERROR);
    }

}

const signUpApple = async (req, res) => {


    if (!req.body.jwt) {
        res.status(400).send('Error: JWT not provided.');
        return;
    }

    try {

        const { payload, protectedHeader } = await jwtVerify(req.body.jwt, publicKeyApple, {
            issuer: 'https://appleid.apple.com',
            audience: process.env.JWT_AUDIENCE_APPLE
        });

        const schema = yup.object().shape({
            email: yup.string().email().required(),
            email_verified: yup.bool().required().oneOf([true]),
            family_name: yup.string().required(),
            given_name: yup.string().required()
        });

        await schema.validate(payload);

        createNewUser({
            req,
            res,
            email: payload.email,
            authenticationMethod: 'APPLE',
            nickname: payload.given_name
        });

    } catch (err) {
        console.error(err);
        res.status(400).send(GENERIC_SIGNUP_ERROR);

    }


}

const signUpGoogle = async (req, res) => {

    if (!req.body.jwt) {
        res.status(400).send('Error: JWT not provided.');
        return;
    }

    try {

        const { payload, protectedHeader } = await jwtVerify(req.body.jwt, publicKeyGoogle, {
            issuer: 'https://accounts.google.com',
            audience: process.env.JWT_AUDIENCE_GOOGLE
        });

        const schema = yup.object().shape({
            email: yup.string().email().required(),
            email_verified: yup.bool().required().oneOf([true]),
            given_name: yup.string().required(),
            family_name: yup.string().required()
        });
        

        await schema.validate(payload);
        
        createNewUser({
            req,
            res,
            email: payload.email,
            authenticationMethod: 'GOOGLE',
            nickname: payload.given_name
        });

    } catch (err) {
        console.error(err);
        res.status(400).send(GENERIC_SIGNUP_ERROR);

    }



}

const signUpCredentials = (req, res) => {

    const schema = yup.object().shape({
        email: yup.string().required().email(),
        password: yup.string().required(),
        passwordConfirm: yup.string().required().oneOf([yup.ref('password')]),
        nickname: yup.string().required()
    });

    schema.validate(req.body)
        .then(async () => {
            if (await userAlreadyExists(req.body.email, 'CREDENTIALS')) {
                res.status(400).send('That email address is not available using the provided authentication method.');
                return;
            }

            createNewUser({
                req,
                res,
                email: req.body.email,
                authenticationMethod: 'CREDENTIALS',
                password: req.body.password,
                nickname: req.body.nickname
            });
        })
        .catch((err) => {
            console.error(err);
            let errorText = 'Invalid request:';
            err.errors.forEach((error) => errorText += (error + '\n'));
            res.status(400).send(errorText);
        })

};

module.exports = { signUpCredentials, signUpApple, signUpGoogle };