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

function verifySignedJwtWebToken(token){
    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        return payload;
    } catch (error) {
        console.log(error)
    }
}

module.exports = {signJwtWebToken, verifySignedJwtWebToken}