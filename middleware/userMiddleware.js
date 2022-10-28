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

            // getting from the headers 
            const authHeader = req.headers["authorization"]

            if (authHeader == undefined) return wrapFailureResponse(res, 400, "Authorization header not found", null)

            if (!authHeader.startsWith("Bearer")) return wrapFailureResponse(res, 400, "Authorization header must start with /Bearer /", null)

            const token = authHeader.substring(7)
            console.log(token)
            let accessToken = token
            const data = verifySignedJwtWebToken(token, process.env.ACCESS_TOKEN_SECRET)

            payload = data.payload

            if (data.payload == null && !data.expired) return wrapFailureResponse(res, 400, "Un-authorized access", null)

            // check for the active status of the tokenhttp://localhost:3000/api/v1/user/login
            const value = await client.get(token)
            console.log(value)
            if(value == null || !JSON.parse(value).active) return wrapFailureResponse(res, 400, "Un-authorized access. Try logging in ", null)

            // checking if the token has expired 
            if (data.payload == null && data.expired){
                payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {ignoreExpiration: true} );

                // delete the token from local storage 
                client.del(token)
                
                // use the id from the payload to get the refresh token
                const storage_key = `${payload._id}_REFRESH_TOKEN`
                const refreshToken = await client.get(storage_key)

                // verify the refresh token and generate a new token for the user 
                const refreshTokenVerification = verifySignedJwtWebToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

                if(refreshTokenVerification.payload == null) return wrapFailureResponse(res, 400, "Messed up", null)

                 accessToken = jwt.sign(
                    {_id: refreshTokenVerification.payload._id}, 
                    process.env.ACCESS_TOKEN_SECRET,
                    {expiresIn: "20s"}
                )

                await client.set(`${accessToken}`, JSON.stringify({active: true}))
            }

            accessToken == token ? accessToken = "": accessToken

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