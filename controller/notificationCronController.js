const Transaction = require("../models/Transaction")

async function CronNotificatioController(){
    let transactions = await Transaction.find({isActive: true, transactionStatus: "NEW"}).populate('account').exec()
    console.log(transactions)
    console.log("this is supposed to be working every minute")
    
    transactions.forEach(()=>{
        
    })

}

module.exports = CronNotificatioController