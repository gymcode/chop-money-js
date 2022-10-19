const mongoose = require('mongoose')
const {Schema} = mongoose

const userSchema = new Schema({
    name: {type: String, min: 3, required: true},
    msisdn: {type: String, min: 9, max: 14, required: true},
    password: String,
    countryCode: {type: String, uppercase: true, default: "GH"},
    isoCode: {type: String, default: "233"},
    email: String,
    gender: String,
    activated: {type: Boolean, default:false},
    isOtpConfirmed: {type: Boolean, default:false},
    isPinSet: {type: Boolean, default:false},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("users", userSchema)

module.exports = model