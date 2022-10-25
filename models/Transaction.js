const mongoose = require("mongoose")
const {Schema} = mongoose

const transactionSchema = new Schema({
    transactionID: String, 
    
})

const model = mongoose.model("transactions", transactionSchema)

module.exports = model