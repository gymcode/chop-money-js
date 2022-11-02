const express = require("express") 
const { Database_Connection } = require("./services/databaseConfig")
const {config} = require("dotenv")
const {BASE_URL} = require("./shared/constants")
config()

const port = process.env.PORT || "8080"
const app = express()

app.use(express.json())

//routes
const userRoutes = require("./routes/userRoute")
const accountRoutes = require("./routes/accountRoute")

// all user routes
app.use(`${BASE_URL}/user`, userRoutes)

// account routes
app.use(`${BASE_URL}/account`, accountRoutes)

app.listen(port, (uri) => {
    // establish the database connection 
    Database_Connection()
    console.log(`Example app listening on port ${uri}`)
},)
