/**
 * Complete user definition.
 *
 * @param id
 * @param username
 * @param firstName
 * @param lastName
 * @param email
 * @param profile
 *
 * @constructor
 */
function User(id, username, firstName, lastName, email, profile) {

    this._id = id;
    this._username = username;
    this._firstName = firstName;
    this._lastName = lastName;
    this._email = email;
    this._profile = profile;
}


User.prototype.getId = function () {
    return this._id;
};

User.prototype.getUsername = function () {
    return this._username;
};

User.prototype.getFirstName = function () {
    return this._firstName;
};

User.prototype.getLastName = function () {
    return this._lastName;
};

User.prototype.getFullName = function () {

    var name = this._firstName;

    if (!name) {
        name = this._lastName;
    } else if (name && this._lastName) {
        name += ' ' + this._lastName;
    }

    return name || this._username;
};

User.prototype.getEmail = function () {
    return this._email;
};

User.prototype.getProfile = function () {
    return this._profile;
};


/**
 *
 * @param data
 *
 * @returns {User}
 */
User.prototype.fromData = function (data) {

    if (!data) {
        return this;
    }

    this._id = data.id;
    this._username = data.username;
    this._firstName = data.first_name;
    this._lastName = data.last_name;
    this._email = data.email;
    this._profile = (new UserProfile()).fromData(data.profile);

    return this;
};


/**
 *
 */
User.prototype.serialize = function () {
    return JSON.stringify({
        id: this._id,
        username: this._username,
        firstName: this._firstName,
        lastName: this._lastName,
        email: this._email,
        profile: this._profile.toData()
    });
};


/**
 *
 */
User.prototype.unserialize = function (s) {

    this.fromData(JSON.parse(s));

    return this;
};


/**
 *
 * @param picture
 * @param birthdate
 * @param gender
 * @param height
 * @param weight
 * @param country
 * @param language
 * @param units
 *
 * @constructor
 */
function UserProfile(picture, birthdate, gender, height, weight, country, language, units) {

    this._picture = picture;
    this._birthdate = birthdate;
    this._gender = gender;
    this._height = height;
    this._weight = weight;
    this._country = country;
    this._language = language;
    this._units = units;
}


/**
 *
 * @param data
 *
 * @returns {UserProfile}
 */
UserProfile.prototype.fromData = function (data) {

    if (!data) {
        return this;
    }

    this._picture = (data.picture_url || data.picture);
    this._birthdate = data.birthdate;
    this._gender = data.gender;
    this._height = data.height;
    this._weight = data.weight;
    this._country = data.country;
    this._language = data.language;
    this._units = data.units;

    return this;
};


/**
 *
 */
UserProfile.prototype.toData = function () {
    return {
        picture: this._picture,
        birthdate: this._birthdate,
        gender: this._gender,
        height: this._height,
        weight: this._weight,
        country: this._country,
        language: this._language,
        units: this._units
    };
};


UserProfile.prototype.getPicture = function () {
    return this._picture;
};

UserProfile.prototype.getBirthdate = function () {
    return this._birthdate;
};

UserProfile.prototype.getGender = function () {
    return this._gender;
};

UserProfile.prototype.getHeight = function () {
    return this._height;
};

UserProfile.prototype.getWeight = function () {
    return this._weight;
};

UserProfile.prototype.getCountry = function () {
    return this._country;
};

UserProfile.prototype.getLanguage = function () {
    return this._language;
};

UserProfile.prototype.getUnits = function () {
    return this._units;
};