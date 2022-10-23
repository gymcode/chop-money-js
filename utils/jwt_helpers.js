const jwt = require('jsonwebtoken')


async function signJwtWebToken(user, client){
    const accessToken = jwt.sign(
        {_id: user._id}, 
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "10s"}
    )

    // expires only when the user logs out
    const refreshToken = jwt.sign(
        {_id: user._id}, 
        process.env.REFRESH_TOKEN_SECRET
    )

    // store refresh token in local storage
    const storageKey = `${user._id}_REFRESH_TOKEN`
    await client.set(storageKey, refreshToken)
    return accessToken
}

function verifySignedJwtWebToken(token, secret){
    try {
        const payload = jwt.verify(token, secret)
        return {payload, error: false, expired: false};
    } catch (error) {
        return {
            payload: null, 
            error: error.message, 
            expired: error.message.includes("jwt expired")} 
    }
}

module.exports = {signJwtWebToken, verifySignedJwtWebToken}