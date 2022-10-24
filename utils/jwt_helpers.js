const jwt = require('jsonwebtoken')


async function signJwtWebToken(user, client){
    const accessToken = jwt.sign(
        {_id: user._id}, 
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "1d"}
    )

    // expires only when the user logs out
    const refreshToken = jwt.sign(
        {_id: user._id}, 
        process.env.REFRESH_TOKEN_SECRET
    )

    // store refresh token in local storage
    const storageKey_refresh = `${user._id}_REFRESH_TOKEN`
    const storageKey_access = `${user._id}_ACCESS_TOKEN`
    await client.set(storageKey_refresh, refreshToken)
    await client.set(storageKey_access, accessToken)
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