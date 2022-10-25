function getMinutes(minutes){
    const currentDate = new Date()
    const newMinutes = currentDate.getUTCDate() + minutes
    currentDate.setMinutes(newMinutes)
   
    return currentDate
}

module.exports = {getMinutes}