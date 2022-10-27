function getMinutes(minutes){
    const currentDate = new Date()
    const newMinutes = currentDate.getMinutes() + minutes
    currentDate.setMinutes(newMinutes)
   
    return currentDate
}

function diffDays(startDate, endDate){
    const start_date = new Date(startDate)
    const end_date = new Date(endDate)

    const diffTime = Math.abs(end_date - start_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

function getWeeksDiff(startDate, endDate) {
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
  
    return Math.round(Math.abs(endDate - startDate) / msInWeek);
}

function getBiWeeksDiff(startDate, endDate) {
    const msInWeek = 1000 * 60 * 60 * 24 * 7 * 2;
  
    return Math.round(Math.abs(endDate - startDate) / msInWeek);
}

function getCurrentDateTime(hours){
    const currentDate = new Date()

    // currentDate.setHours(0, 0, 0, 0);

    const newMinutes = currentDate.getDay() + hours
    currentDate.setHours(newMinutes)
   
    return currentDate
}

function pad(str){
    return str.toString().padStart(2, "0")    
}

function getDate(date){
    const formattedDate = [
        date.getFullYear(),pad(date.getMonth() + 1),pad(date.getDate())
        ].join("-")
    return formattedDate
}


module.exports = {
    getMinutes,
    diffDays,
    getDate,
    getCurrentDateTime,
    getWeeksDiff,
    getBiWeeksDiff
}