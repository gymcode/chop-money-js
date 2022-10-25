const mongoose = require("mongoose")
const {Schema} = mongoose

const accountSchema = new Schema({
    chopMoneyOwner: {type: String, enum: ["MYSELF", "OTHERS"]},
    isBeneficiary: {type: String, default: false},
    beneficiaryContact: {type: String},
    beneficiaryName: String,
    ownerContact: String,
    ownerName: String,
    payFrequency: {type: String, enum: ["DAILY", "WEEKLY", "BI-WEEKLY"]},
    payFrequencyAmount: Double,
    startDate: {type: Date, default: new Date()},
    endDate: {type: Date},
    payTime: {type: String},
    totalPayAmount: Double,
    remainder: {type:Double, default: 0.0},
    transactions: [{type: Schema.Types.ObjectId, ref: 'transactions'}],
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("accounts", accountSchema)

module.exports = model