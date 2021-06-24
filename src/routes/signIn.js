const yup = require('yup');
const { jwtVerify } = require('jose/jwt/verify');
const { SignJWT } = require('jose/jwt/sign');
const { sequelize, RefreshToken, User } = require('src/models');
const { privateKeyTimelapseme, publicKeyGoogle, publicKeyApple } = require('src/oauthKeys');
const secureRandom = require('secure-random');
const bcrypt = require('bcrypt');

const { Sequelize } = require('sequelize');

const SALT_ROUNDS = 10;

const validateRefreshToken = async (transaction, refreshTokenValue) => {

    const result = await RefreshToken.findOne({
        where: {
            value: refreshTokenValue
        }
    }, { transaction });

    if (!result) {
        throw (new Error('That refresh token is invalid.'));
    } else if (result.expires.valueOf() <= new Date().valueOf()) {
        throw (new Error('That refresh token has expired.'));
    }
}

const generateRefreshToken = (transaction) => {
    return RefreshToken.create({
        value: secureRandom(128, { type: 'Buffer' }).toString('base64')
    }, { transaction });
}


 const generateJwt = (user) => {

    return new SignJWT({ userId: user.id, given_name: user.firstName, family_name: user.lastName })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(process.env.JWT_ISSUER)
        .setAudience(process.env.JWT_AUDIENCE)
        .setExpirationTime('15m')
        .sign(privateKeyTimelapseme);

}

const updateTokens = async (transaction, refreshTokenValue, req, res) => {

    const oldRefreshToken = await RefreshToken.findOne({
        where: {
            value: refreshTokenValue
        }
    }, { transaction });

    const user = await User.findOne({
        where: {
            id: oldRefreshToken.UserId
        }
    }, { transaction });

    await RefreshToken.destroy({
        where: {
            value: oldRefreshToken.value
        }
    }, { transaction })

    const newRefreshToken = await generateRefreshToken(transaction);

    await user.addRefreshToken(newRefreshToken, { transaction })

    const newAccessToken = await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(process.env.JWT_ISSUER)
        .setAudience(process.env.JWT_AUDIENCE)
        .setExpirationTime('15m')
        .sign(privateKeyTimelapseme);

    await transaction.commit();

    res.status(200).json({
        refreshToken: newRefreshToken.value,
        accessToken: newAccessToken
    }).send();

}

const handleError = (err, req, res) => {
    if (err instanceof yup.ValidationError) {
        let responseText = 'Error:\n';
        err.errors.forEach((error) => responseText += (error + '\n'));
        res.status(400).send(responseText);
    } else {
        console.error(err);
        res.status(400).send('An error occurred while attempting to obtain a new access token with this refresh token.');
    }
}

const getUser = (transaction, email, authenticationMethod) => {
    return User.findOne({
        where: {
            email: Sequelize.where(
                Sequelize.fn('lower', Sequelize.col('email')),
                Sequelize.fn('lower', email)
            ),
            authenticationMethod: authenticationMethod
        }
    }, { transaction });
}

const signInOauth = async (req, res, authenticationMethod, publicKey, jwtIssuer, jwtAudience,) => {

    try {

        if (!req.body.jwt) {
            res.status(400).send('JWT not provided.');
            return;
        }

        const { payload, protectedHeader } = await jwtVerify(req.body.jwt, publicKey, {
            issuer: jwtIssuer,
            audience: jwtAudience
        });

        const schema = yup.object().shape({
            email: yup.string().email().required()
        })

        await schema.validate(payload);

        const transaction = await sequelize.transaction();

        const user = await getUser(transaction, payload.email, authenticationMethod);

        if(user === undefined || user === null) {
            res.status(400).send('Invalid JWT: user not found.');
            return;
        }

        const refreshToken = await generateRefreshToken(transaction);
        const accessToken = await generateJwt(user);

        await user.addRefreshToken(refreshToken, { transaction });

        await transaction.commit();

        res.status(200).json({
            accessToken,
            refreshToken: refreshToken.value,
            firstName: user.firstName,
            lastName: user.lastName
        });

    } catch (err) {
        console.error(err);
        res.status(400).send('An error occured while processing this JWT.');
    }

};

const signInGoogle = (req, res) => {
    signInOauth(req, res, 'GOOGLE', publicKeyGoogle, 'https://accounts.google.com', process.env.JWT_AUDIENCE_GOOGLE);
}

const signInApple = (req, res) => {
    signInOauth(req, res, 'APPLE', publicKeyApple, 'https://appleid.apple.com', process.env.JWT_AUDIENCE_APPLE);
};

const signInCredentials = async (req, res) => {

    const GENERIC_CREDENTIAL_ERROR = 'Invalid credentials.';

    try {

        const validationSchema = yup.object().shape({
            email: yup.string().email().required(),
            password: yup.string().required()
        });

        await validationSchema.validate(req.body);

        const transaction = await sequelize.transaction();

        const user = await User.findOne({
            where: {
                email: Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('email')),
                    Sequelize.fn('lower', req.body.email)
                )
            }
        }, { transaction });

        if (user?.passwordHash === null || user?.passwordHash === undefined) {
            res.status(400).send(GENERIC_CREDENTIAL_ERROR);
            return;
        }

        const match = await bcrypt.compare(req.body.password, user.passwordHash);

        if (!match) {
            res.status(400).send(GENERIC_CREDENTIAL_ERROR);
            return;
        }

        const refreshToken = await generateRefreshToken(transaction);
        const accessToken = await generateJwt(user);

        await user.addRefreshToken(refreshToken, { transaction });

        await transaction.commit();

        res.status(200).json({
            accessToken,
            refreshToken: refreshToken.value,
            firstName: user.firstName,
            lastName: user.lastName
        });

    } catch (err) {
        handleError(err, req, res);
    }

};

/**
 * Takes a refresh token from the user and then issues a new access token and a new refresh token.
 * @param {*} req 
 * @param {*} res 
 */
const refresh = async (req, res) => {

    const validationSchema = yup.object().shape({
        refreshToken: yup.string().required()
    });

    const transaction = await sequelize.transaction();

    validationSchema.validate(req.body)
        .then(() => validateRefreshToken(transaction, req.body.refreshToken))
        .then(() => updateTokens(transaction, req.body.refreshToken, req, res))
        .catch((err) => handleError(err, req, res));

}

module.exports = { signInGoogle, signInApple, signInCredentials, refresh };