const express = require("express") 
const { Database_Connection } = require("./services/databaseConfig")
const {config} = require("dotenv")
const {BASE_URL} = require("./shared/constants")
config()


const port = process.env.PORT || 5000
const app = express()

//routes
const userRoutes = require("./routes/userRoute")



app.use(`${BASE_URL}/user`, userRoutes)

app.listen(port, (uri) => {
    // establish the database connection 
    Database_Connection()
    console.log(`Example app listening on port ${uri}`)
},)
