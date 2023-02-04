const User = require("../models/User");

export async function addUser(request, msisdn, names) {
  const userRequest = new User({
    username: request.username,
    firstName: names[0],
    otherNames: names.slice(1).join(" "),
    msisdn: msisdn,
    countryCode: request.countryCode,
    isoCode: request.isoCode,
  });
  return await userRequest.save();
}

export async function getUserByMsisdn(msisdn) {
  return await User.findOne({ msisdn: msisdn }).exec();
}

export async function getPopulatedUserDetailsByMsisdn(msisdn) {
  return await User.findOne({ msisdn: msisdn })
    .populate({
      path: "accounts",
      populate: { path: "transactions" },
    })
    .exec();
}

export async function updateOTPIsOtpConfirmed(user) {
  return await User.findOneAndUpdate(
    { _id: user._id },
    { isOtpConfirmed: true, update_at: new Date() },
    {
      new: true,
      upsert: true,
      rawResult: true, 
    }
  );
}

export async function resetUserAccount(user) {
  return await User.findOneAndUpdate(
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
      rawResult: true, 
    }
  );
}

export async function updateUserDetails(request, user) {
  return await User.findOneAndUpdate(
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
      rawResult: true, 
    }
  );
}


export async function activateUserAccount(hashedPin, user) {
  return await User.findOneAndUpdate(
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
}
