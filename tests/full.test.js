const axios = require('axios');

const EMAIL = 'cow25@cow.jp';
const PASSOWRD = 'password'
const WEB_ROOT = 'https://auth.timelapseme.cameronwhite.io'

const GOOGLE_JWT = '';
const APPLE_JWT = '';

const FIRST_NAME = 'Cameron';
const LAST_NAME = 'White';

let currentRefreshToken = '';

test('Creating an account using credentials', (done) => {
    try {
        axios.post(WEB_ROOT + '/api/v1/signup/credentials', {
            email: EMAIL,
            password: PASSOWRD,
            passwordConfirm: PASSOWRD,
            firstName: FIRST_NAME,
            lastName: LAST_NAME
        })
            .then((res) => {
                expect(res.data).toEqual(
                    expect.objectContaining({
                        accessToken: expect.any(String),
                        refreshToken: expect.any(String)
                    })
                );
                expect(res.status).toEqual(200)
                done();
            })
            .catch((err) => {
                done(err);
            });

    } catch (err) {
        done(err);
    }
});

test('Signing in using credentials', (done) => {
    axios.post(WEB_ROOT + '/api/v1/auth/credentials', {
        email: EMAIL,
        password: PASSOWRD,
    })
        .then((res) => {
            expect(res.data).toEqual(
                expect.objectContaining({
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
            expect(res.status).toEqual(200)
            currentRefreshToken = res.data.refreshToken;
            done();
        })
        .catch((err) => {
            done(err);
        })
});

test('Use a refresh token to update tokens', (done) => {
    axios.post(WEB_ROOT + '/api/v1/refresh', {
        refreshToken: currentRefreshToken
    })
        .then((res) => {
            expect(res.data).toEqual({
                accessToken: expect.any(String),
                refreshToken: expect.any(String)
            });
            expect(res.status).toEqual(200)
            done();
        })
        .catch((err) => {
            done(err);
        })
});

test('Create account using Google JWT', (done) => {
    axios.post(WEB_ROOT + '/api/v1/signup/google', {
        jwt: GOOGLE_JWT
    })
        .then((res) => {
            expect(res.data).toEqual(
                expect.objectContaining({
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
            expect(res.status).toEqual(200);

            done();
        })
        .catch((err) => {
            done(err);
        })
});

test('Signing in using Google JWT', (done) => {
    axios.post(WEB_ROOT + '/api/v1/auth/google', {
        jwt: GOOGLE_JWT
    })
        .then((res) => {
            expect(res.data).toEqual(
                expect.objectContaining({
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
            expect(res.status).toEqual(200);
            done();
        })
        .catch((err) => {
            done(err);
        })
});


test('Create account using Apple JWT', (done) => {
    axios.post(WEB_ROOT + '/api/v1/signup/apple', {
        jwt: APPLE_JWT
    })
        .then((res) => {
            expect(res.data).toEqual(
                expect.objectContaining({
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
            expect(res.status).toEqual(200);

            done();
        })
        .catch((err) => {
            done(err);
        })
});

test('Signing in using Apple JWT', (done) => {
    axios.post(WEB_ROOT + '/api/v1/auth/apple', {
        jwt: APPLE_JWT
    })
        .then((res) => {
            expect(res.data).toEqual(
                expect.objectContaining({
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
            expect(res.status).toEqual(200);

            done();
        })
        .catch((err) => {
            done(err);
        })
});