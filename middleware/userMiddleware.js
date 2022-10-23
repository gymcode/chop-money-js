const {wrapFailureResponse} = require("../shared/response")
const {verifySignedJwtWebToken} = require("../utils/jwt_helpers")
const User  = require("../models/User")
const jwt = require('jsonwebtoken')

function userValidationMiddleware (schema){
    return (req,res, next)=>{
        try {
            const {error} =  schema.validate(req.body)

            if (error == undefined) return next()
            wrapFailureResponse(res, 422,error.details[0].message, error)
        } catch (error) {
            console.error(error)
        }
    }
}

function isUserAuthenticated(client){
    return async (req, res, next) =>{
        try {
            let payload;
            let accessToken = ""

            // getting from the headers 
            const authHeader = req.headers["authorization"]
            console.log(authHeader)

            if (authHeader == undefined) wrapFailureResponse(res, 400, "Authorization header not found", null)

            if (!authHeader.startsWith("Bearer")) wrapFailureResponse(res, 400, "Authorization header must start with /Bearer /", null)

            const token = authHeader.substring(7)
            const data = verifySignedJwtWebToken(token, process.env.ACCESS_TOKEN_SECRET)
            console.log(data, "coming from the data")

            payload = data.payload

            if (data.payload == null && !data.expired) wrapFailureResponse(res, 400, "Authorized access get the user details", null)

            // checking if the token has expired 
            if (data.payload == null && data.expired){
                payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {ignoreExpiration: true} );
                
                // use the id from the payload to get the refresh token
                const storage_key = `${payload._id}_REFRESH_TOKEN`
                const refreshToken = await client.get(storage_key)

                // verify the refresh token and generate a new token for the user 
                const refreshTokenVerification = verifySignedJwtWebToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                console.log(refreshTokenVerification)

                if(refreshTokenVerification.payload == null) wrapFailureResponse(res, 400, "Messed up", null)

                 accessToken = jwt.sign(
                    {_id: refreshTokenVerification.payload._id}, 
                    process.env.ACCESS_TOKEN_SECRET,
                    {expiresIn: "1d"}
                )
            }

            // use the id in the payload to get the user data 
            const user = await User.findOne({ _id: payload._id }).exec()
            const user_info = {user: user, token: accessToken}
            res.locals.user_info = user_info

            return next()
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = {
    userValidationMiddleware,
    isUserAuthenticated
}