const { CountryMsisdnValidation } = require("../utils/msisdnValidation");
const {
  wrapFailureResponse,
  wrapSuccessResponse,
} = require("../shared/response");
const GenerateOTP = require("../utils/generateOtp");
const client = require("../config/redis");
const bcrypt = require("bcryptjs");
const { getMinutes } = require("../utils/dateTimeHelpers");
const { NaloSendSms } = require("../config/sms");

// user model
const User = require("../models/User");
const generateOtp = require("../utils/generateOtp");
const _ = require("lodash");
const { signJwtWebToken } = require("../utils/jwt_helpers");

/*
register a new user 
*/
exports.userRegistration = async (req, res) => {
  try {
    // validating the msisdn based on the country code
    const request = req.body;
    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }
    const msisdn = msg;

    // checking in the database if the user already exists
    let user = await User.findOne({ msisdn: msisdn }).exec();

    if (user != null) {
      if (user.isPinSet)
        return wrapFailureResponse(res, 404, "User already exists", null);

      if (!user.isOtpConfirmed || !user.isPinSet)
        return wrapSuccessResponse(res, 200, user);
    }

    // add user
    const userInput = new User({
      username: request.username,
      msisdn: msisdn,
      countryCode: request.countryCode,
      isoCode: request.isoCode,
    });
    user = await userInput.save();

    if (user == null)
      return wrapFailureResponse(
        res,
        500,
        "Could not insert in the database",
        null
      );

    // generate code  hash code
    const code = GenerateOTP();
    console.log(code);
    const codeHash = bcrypt.hashSync(`${code}`, bcrypt.genSaltSync(10));
    const storageKey = `${user._id}_OTP`;

    const expiryDate = getMinutes(5);
    const otpStorageObject = {
      code: codeHash,
      expire_at: expiryDate,
    };

    await client.set(storageKey, JSON.stringify(otpStorageObject));

    // TODO(send SMS to user with the otp)
    NaloSendSms(
      `+${msisdn}`,
      `Your Chopmoney one-time PIN is: ${code} \n Don’t share it with anyone. \n\n Stick to your budget the smart way! www.chopmoney.co`
    );
    wrapSuccessResponse(res, 200, user);
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should confirm otp
*/
exports.confirmOTP = async (req, res) => {
  try {
    // getting the request body
    const request = req.body;
    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }

    const msisdn = msg;
    // getting the user details based on the msisdn
    const user = await User.findOne({ msisdn: msisdn }).exec();
    if (user == null)
      return wrapFailureResponse(
        res,
        404,
        "You do not have an account, please consider siging up",
        null
      );

    // get the otp from the cached data
    const storageKey = `${user._id}_OTP`;
    const value = await client.get(storageKey);
    const data = JSON.parse(value);
    if (data == null && user.isOtpConfirmed)
      return wrapSuccessResponse(
        res,
        200,
        "You have already confirmed the OTP",
        null
      );

    if (data == null && !user.isOtpConfirmed)
      return wrapFailureResponse(res, 500, "Please try signing up first", null);

    // checking for the expire by comparison
    const currentDateTime = new Date();
    if (currentDateTime > new Date(data.expire_at))
      return wrapFailureResponse(
        res,
        500,
        "The OTP has expired, please resend OTP"
      );

    // comparing the hashed OTP and the code
    const otpCodeComparison = bcrypt.compareSync(request.code, data.code);
    if (!otpCodeComparison)
      return wrapFailureResponse(
        res,
        500,
        "OTPs do not match, please try again"
      );

    // deleting the cached data
    client.del(storageKey);

    // update otp confirm status for the user
    const resp = await User.findOneAndUpdate(
      { _id: user._id },
      { isOtpConfirmed: true, update_at: new Date() },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );

    if (!resp.value.isOtpConfirmed)
      return wrapFailureResponse(
        res,
        200,
        "Could not update OTP confirmation status",
        null
      );

    wrapSuccessResponse(res, 200, resp.value, null);
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should resend otp
*/
exports.resendOTP = async (req, res) => {
  try {
    const request = req.body;
    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }

    const msisdn = msg;
    // getting the user details based on the msisdn
    const user = await User.findOne({ msisdn: msisdn }).exec();
    if (user == null)
      return wrapFailureResponse(
        res,
        404,
        "You do not have an account, please consider siging up",
        null
      );

    // generating the otp
    const code = generateOtp();
    console.log(code);
    const codeHash = bcrypt.hashSync(`${code}`, bcrypt.genSaltSync(10));

    const storageKey = `${user._id}_OTP`;

    const expiryDate = getMinutes(5);
    const otpStorageObject = {
      code: codeHash,
      expire_at: expiryDate,
    };

    await client.set(storageKey, JSON.stringify(otpStorageObject));

    // TODO(send SMS to user with the otp)
    NaloSendSms(
      `+${msisdn}`,
      `Your one time password for chop money is ${code}`
    );

    wrapSuccessResponse(res, 200, user);
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

exports.resetPin = async (req, res) => {
  try {
    // validating the msisdn based on the country code
    const request = req.body;
    console.log(request);
    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }
    const msisdn = msg;

    // checking in the database if the user already exists
    let user = await User.findOne({ msisdn: msisdn }).exec();
    if (user == null)
      return wrapFailureResponse(
        res,
        404,
        "User does not exist. Please sign up",
        null
      );

    // generate code  hash code
    const code = GenerateOTP();
    console.log(code);
    const codeHash = bcrypt.hashSync(`${code}`, bcrypt.genSaltSync(10));
    const storageKey = `${user._id}_OTP`;

    const expiryDate = getMinutes(5);
    const otpStorageObject = {
      code: codeHash,
      expire_at: expiryDate,
    };

    await client.set(storageKey, JSON.stringify(otpStorageObject));

    // update user details
    const resp = await User.findOneAndUpdate(
      { _id: user._id },
      {
        isPinSet: false,
        activated: false,
        isOtpConfirmed: false,
        update_at: new Date(),
      },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );
    // console.log(resp)
    if (resp.ok != 1)
      return wrapFailureResponse(res, 200, "Could not reset account", null);

    // TODO(send SMS to user with the otp)
    NaloSendSms(
      `+${msisdn}`,
      `Your one time password for chop money is ${code}`
    );

    wrapSuccessResponse(res, 200, user);
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should set pin
*/
exports.setPin = async (req, res) => {
  try {
    const request = req.body;

    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }

    const msisdn = msg;
    // getting the user details based on the msisdn
    const user = await User.findOne({ msisdn: msisdn }).exec();
    if (user == null)
      return wrapFailureResponse(
        res,
        404,
        "You do not have an account, please consider siging up",
        null
      );

    // compare pins
    if (request.pin != request.confirm_pin)
      return wrapFailureResponse(res, 500, "Pins do not match", null);

    // hash pin and store in th database
    const hashedPin = bcrypt.hashSync(request.pin, bcrypt.genSaltSync(10));

    const resp = await User.findOneAndUpdate(
      { _id: user._id },
      {
        isPinSet: true,
        password: hashedPin,
        activated: true,
        update_at: new Date(),
      },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );

    if (!resp.value.isPinSet)
      return wrapFailureResponse(
        res,
        200,
        "Could not update OTP confirmation status",
        null
      );

    // TODO generate and store token
    // expires in one day
    const token = await signJwtWebToken(user, client);

    wrapSuccessResponse(
      res,
      200,
      _.omit(resp.value._doc, ["password"]),
      null,
      token
    );
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it shoudld handle logging in a new user and storing auth token
*/
exports.userLogin = async (req, res) => {
  try {
    const request = req.body;

    const { error, msg } = CountryMsisdnValidation(
      request.msisdn,
      request.countryCode
    );
    if (error) {
      return wrapFailureResponse(res, 422, msg, null);
    }

    const msisdn = msg;
    // getting the user details based on the msisdn
    const user = await User.findOne({ msisdn: msisdn })
      .populate({
        path: "accounts",
        populate: { path: "transactions" },
      })
      .exec();
    console.log(user);
    if (user == null)
      return wrapFailureResponse(
        res,
        404,
        "You do not have an account, please consider siging up",
        null
      );

    // checking if the user's password exists in the database
    if (user.password == undefined)
      return wrapFailureResponse(
        res,
        404,
        "Password does not seem to have been set whiles the pin was being set",
        null
      );

    // if (new Date() < user.lockPeriod)
    //     return wrapFailureResponse(res, 500, "Sorry cannot try until the time elapses.")

    const pinConfirmationStatus = bcrypt.compareSync(
      request.pin,
      user.password
    );
    if (!pinConfirmationStatus) {
      return wrapFailureResponse(res, 404, "wrong password", null);
    } else {
      // success
      const token = await signJwtWebToken(user, client);
      wrapSuccessResponse(
        res,
        200,
        _.omit(JSON.parse(JSON.stringify(user)), ["password"]),
        null,
        token
      );
    }
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should handle getting a single user 
*/
exports.getUser = (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    wrapSuccessResponse(
      res,
      200,
      _.omit(JSON.parse(JSON.stringify(user)), ["password"]),
      null,
      token
    );
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should update user details 
*/
exports.updateUserDetails = async (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    const request = req.body;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    // update the users details
    const resp = await User.findOneAndUpdate(
      { _id: user._id },
      {
        username: request.username,
        email: request.email,
        gender: request.gender,
        update_at: new Date(),
      },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );

    if (resp.ok != 1)
      return wrapFailureResponse(
        res,
        200,
        "Could not update user detail",
        null
      );

    wrapSuccessResponse(
      res,
      200,
      _.omit(resp.value._doc, ["password"]),
      null,
      token
    );
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/*
it should sign out user 
*/
exports.logOut = (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    // setting the access token to false
    client.set(token, JSON.stringify({ active: false }));

    // deleting the refresh token from the cache
    const storageKey = `${user._id}_REFRESH_TOKEN`;
    client.del(storageKey);

    wrapSuccessResponse(res, 200, null, null, "");
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, `An Error occured: ${error}`);
  }
};

/**
 * Deleting user account
 * @param {*} req
 * @param {*} res
 */
exports.delete = (req, res) => {};
