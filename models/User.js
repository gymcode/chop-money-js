const mongoose = require('mongoose')
const {Schema} = mongoose

const userSchema = new Schema({
    username: {type: String, min: 3, required: true},
    firstName: String,
    otherNames: String,
    provider: String,
    msisdn: {type: String, min: 9, max: 14, required: true},
    password: String,
    countryCode: {type: String, uppercase: true, default: "GH"},
    isoCode: {type: String, default: "233"},
    email: String,
    gender: String,
    invalidLoginAttempts: {type: Number, default: 0},
    lockCoeff: {type: Number, default: 0},
    lockPeriod: {type: Date, default: new Date()},
    userLockStatus: {type: Boolean, default: false},
    activated: {type: Boolean, default:false},
    isOtpConfirmed: {type: Boolean, default:false},
    isPinSet: {type: Boolean, default:false},
    playerId: {type: String, default: ""},
    isDelete: {type: Boolean, default: false},
    deleteDayCount: {type: Number, default: 0},
    accounts: [{type: Schema.Types.ObjectId, ref: 'accounts'}],
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("users", userSchema)

module.exports = model