const { Double } = require("mongodb")
const mongoose = require("mongoose")
const {Schema} = mongoose

const transactionSchema = new Schema({
    transactionID: String, 
    date: Date,
    time: String,
    transactionStatus: {
        type: String, 
        enum: ["COMPLETED", "FAILED", "NEW"],
        default: "NEW"
    },
    transactionAmount: Number,
    isActive: {type: Boolean, default: true},
    account: {type: Schema.Types.ObjectId, ref: "accounts"},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("transactions", transactionSchema)

module.exports = model