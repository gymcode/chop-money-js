const { Double } = require("mongodb")
const mongoose = require("mongoose")
const {Schema} = mongoose

const transactionSchema = new Schema({
    transactionID: String, 
    date: Date,
    time: String,
    transactionStatus: {
        type: String, 
        enum: ["PENDING", "COMPLETED", "FAILED", "NEW"],
        default: "NEW"
    },
    transactionAmount: Double,
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("transactions", transactionSchema)

module.exports = model