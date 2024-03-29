const mongoose = require("mongoose")
const {config} = require("dotenv")

async function Database_Connection(){
  config()
  try {
    const options = {
      autoIndex: false, // Don't build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    const uri = process.env.DB_URI 
    const conn = mongoose.connect(uri, options)
    conn
    .then(
      ()=>{
          console.log(`You have successfully established a database connection`)
      })
    .catch((err=>{console.error(`An Error occured trying to establish a database connection:: Error=> ${err}`)}))
  } catch (error) {
    console.error(`An Error occured trying to a database connection:: Error=> ${error}`)
    process.exit(1);
  }
}

module.exports = {
  Database_Connection
}