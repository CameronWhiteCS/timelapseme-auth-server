const { Sequelize, DataTypes } = require('sequelize');

console.log(process.env.MYSQL_USER);

const sequelize = new Sequelize(`mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`, {
    dialect: 'mysql',
    logging: false
});

sequelize.authenticate()
    .then(() => {
        console.log('MySQL connection has been established successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the MySQL database :(', error);
        process.exit(1);
    });

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING(512),
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING(256),
        allowNull: true
    },
    authenticationMethod: {
        type: DataTypes.ENUM('APPLE', 'GOOGLE', 'CREDENTIALS'),
        allowNull: false

    },
    nickname: {
        type: DataTypes.STRING(128),
        allowNull: false
    }
});

const RefreshToken = sequelize.define('RefreshToken', {
    value: {
        type: DataTypes.STRING(256),
        allowNull: false,
        unique: true
    },
    issued: {
        type: DataTypes.DATE,
        defaultValue: new Date()
    },
    expires: {
        type: DataTypes.DATE,
        defaultValue: new Date(new Date().valueOf() + (1000 * 60 * 60 * 24 * 7))
    }
});

const handleModelError = (err) => {
    if (err) {
        console.error(err);
    }
}

const initModels = async () => {

    await User.hasMany(RefreshToken);

    await User.sync(handleModelError);
    await RefreshToken.sync(handleModelError);

};

module.exports = { RefreshToken, User, sequelize, initModels };