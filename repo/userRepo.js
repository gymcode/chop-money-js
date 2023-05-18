const User = require("../models/User");

 async function addUser(request, msisdn, names) {
  const userRequest = new User({
    username: request.username,
    firstName: names[0],
    otherNames: names.slice(1).join(" "),
    msisdn: msisdn,
    countryCode: request.countryCode,
    isoCode: request.isoCode,
    provider: request.provider
  });
  return await userRequest.save();
}

 async function getUserByMsisdn(msisdn) {
  return await User.findOne({ msisdn: msisdn }).exec();
}

 async function getPopulatedUserDetailsByMsisdn(msisdn) {
  return await User.findOne({ msisdn: msisdn })
    .populate({
      path: "accounts"
    })
    .exec();
}

 async function updateOTPIsOtpConfirmed(user) {
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

 async function resetUserAccount(user) {
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
 
 async function updateUserDetails(request, user) {
  return await User.findOneAndUpdate(
    { _id: user._id },
    {
      username: request.username,
      email: request.email,
      update_at: new Date(),
    },
    {
      new: true,
      upsert: true,
      rawResult: true, 
    }
  );
}

async function updatePlayerID(msisdn, playerId) {
  return await User.findOneAndUpdate(
    { msisdn: msisdn },
    {
      playerId: playerId,
      update_at: new Date(),
    },
    {
      new: true,
      upsert: true,
      rawResult: true, 
    }
  );
}

 async function activateUserAccount(hashedPin, user) {
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


async function updateUserAccountDeleteStatus(userId) {
  return await User.updateOne(
    { _id: userId },
    {
      updateAt: new Date(),
      isDelete: true
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function updateUserAccountDeleteCount(userId, deleteCount) {
  return await User.updateOne(
    { _id: userId },
    {
      updateAt: new Date(),
      isDeleteDayCount: deleteCount
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function deleteAccount(userId){
  return await User.deleteOne({_id: userId})
}

function addAccountsToUser(user, accountResponse){
    user.accounts.push(accountResponse._id);
    user.save();
  }


module.exports = {
  addUser,
  getUserByMsisdn,
  getPopulatedUserDetailsByMsisdn,
  updateOTPIsOtpConfirmed,
  updateUserDetails,
  resetUserAccount,
  activateUserAccount,
  addAccountsToUser,
  updatePlayerID,
  deleteAccount,
  updateUserAccountDeleteStatus, 
  updateUserAccountDeleteCount
}