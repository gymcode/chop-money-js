const express = require("express") 
const { Database_Connection } = require("./services/databaseConfig")
const {config} = require("dotenv")
const {BASE_URL} = require("./shared/constants")
const cron = require('node-cron');
const CronNotificatioController = require("./controller/notificationCronController")
config()

const port = process.env.PORT || "8080"
const app = express()

app.use(express.json())


//routesconfig()
const userRoutes = require("./routes/userRoute")
const accountRoutes = require("./routes/accountRoute");

// all user routes
app.use(`${BASE_URL}/user`, userRoutes)

// account routes
app.use(`${BASE_URL}/account`, accountRoutes)

app.listen(port, () => {
    // establish the database connection 
    Database_Connection()
    console.log(`Example app listening on port ${port}`)

    // run cron configuration and call 
    cron.schedule('1 * * * * *', () => {
        // create cron controller 
        CronNotificatioController()
    });  
},)
