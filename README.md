# TimeLapseMe Authentication Server

REST API that issues JSON Web Tokens to be consumed by the TimeLapseMe resource server. Supports credential based authentication and OAuth 2.0 identity providers.

---

## OAuth 2.0 Support 

TimeLapseMe's authentication server supports the following OAuth 2.0 providers:
  - Apple (apple)
  - Google (google)

Each provider has its own sign in and sign up route, though the parameters for each type of operation are the same. For the sake of avoiding repetition in the API documentation, "providerName" is used instead of each specific provider. In all cases, the provider's name should be stylized in lower camel case as specified in paraenthesis in the above list.

For example, when creating an account using Google, a POST request is made to /api/v1/signup/google

## Configuration

TimeLapseMe's auth server is configured using environment variables via the ([dotenv](https://www.npmjs.com/package/dotenv)) package. The following variables are required:

PORT - Port the authentication server runs on.

JWT_PRIVATE_KEY_PATH - Path designating the location of the PEM-formatted RSA private key file used to sign JWT's issued by this server.

JWT_PUBLIC_KEY_PATH - Path designating the location of the PEM-formatted RSA public key file used to sign JWT's issued by this server.

JWT_ISSUER - the "iss" field of the JWT issued by this server.

JWT_AUDIENCE - the "aud" field of the JWT issued by this server.

JWT_AUDIENCE_GOOGLE - The expected 'aud' field of JWTs issued by google. If the aud field of a JWT sent by the client doesn't match, it will be rejected.

JWT_AUDIENCE_APPLE - The expected 'aud' field of JWTs issued by apple. If the aud field of a JWT sent by the client doesn't match, it will be rejected.
 
MYSQL_USER - Self explanatory

MYSQL_PASSWORD - Self explanatory

MYSQL_HOST - Self explanatory

MYSQL_PORT - Self explanatory

MYSQL_DATABASE - Self explanatory

## Token Structure

JWTs issued by this auth server contain the following properties:

- given_name (first name)
- family_name (last name)
- userId

## API

### API Errors

In the event of an error, the auth server will return a plain text (text/html) error, not a JSON object.

### API Tree

```
/
  /api/
    /api/v1/
      /api/v1/auth/
        /api/v1/auth/google
        /api/v1/auth/apple
        /api/v1/auth/credentials
      /api/v1/signup/
        /api/v1/signup/google
        /api/v1/signup/apple
        /api/v1/signup/credentials
      /api/v1/refresh
```

### Creating an Account

**POST /api/v1/signup/credentials**

*request*

```json
{
    "email":"cow@cow.jp",
    "password":"password",
    "passwordConfirm":"password",
    "firstName":"Melvin",
    "lastName":"Friedman"
}
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"refresh token here..."
  }
```

**POST /api/v1/signup/providerName**

*request*

```json
  {
    "jwt":"provider.jwt.here"
  }
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"refresh token here..."
  }
```

### Signing in

**POST /api/v1/auth/credentials**

*request*

```json
{
    "email":"cow@cow.jp",
    "password":"Moo00!_*&"
}
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"refresh token here..."
  }
```

The TimeLapseMe authentication server accepts JWT's from the previously listed OAuth providers as proof of identity. The only requirement is that the JWT provided by the client must include the email property as specified in the [OpenID Connect](https://openid.net/connect/) standard.

**POST /api/v1/auth/providerName**

*request*

```json
  {
    "jwt":"oauth.jwt.here"
  }
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"refresh token here..."
  }
```

**POST /api/v1/auth/credentials**

*request*

```json
{
    "email":"cow@cow.jp",
    "password":"password"
}
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"refresh token here..."
  }
```

### Refresh Tokens

TimeLapseMe uses rotating refresh tokens for enhanced security. After the client uses a refresh token to obtain an updated JWT, a new refresh token is issued and the prior one is invalidated.

**POST /api/v1/refresh**

*request*

```json
  {
    "refreshToken":"refresh token here"
  }
```

*response*

```json
  {
    "acessToken":"access.token.here",
    "refreshToken":"Updated refresh token here..."
  }
```