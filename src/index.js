const dotenv = require('dotenv');

const dontEnvResult = dotenv.config();

if (dontEnvResult.error) {
    console.error(dontEnvResult.error);
    process.exit(1);
}

const express = require('express');
const { SignJWT } = require('jose/jwt/sign');
const { signUpCredentials, signUpApple, signUpGoogle } = require('src/routes/signUp');
const { signInGoogle, signInApple, signInCredentials, refresh } = require('src/routes/signIn');

const { initModels } = require('src/models');

const app = express();


app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/v1/auth/google', signInGoogle);
app.post('/api/v1/auth/apple', signInApple);
app.post('/api/v1/auth/credentials', signInCredentials);

app.post('/api/v1/signup/google', signUpGoogle);
app.post('/api/v1/signup/apple', signUpApple);
app.post('/api/v1/signup/credentials', signUpCredentials);

app.post('/api/v1/refresh', refresh);



const init = () => {
    console.log('TimeLapseMe authentication server initializing...');
    initModels()

        .then(() => {
            console.log('Initialization complete.');
            app.listen(process.env.PORT);
        });

}

init();
