function build_chart(stn_data) {
    const canv = document.querySelector('#chart-container');
    // get times as HHam/HHpm
    let times_pretty = [];
    for(let time of stn_data.map((x) => x.date)){
        // get time from period.startTime
        let date_ts = Date.parse(time);
        let date = new Date(date_ts);
        let hour24 = date.getHours();
        // console.log("hour24:", hour24)
        let am_pm = "am";
        let hour = hour24;
        if(hour24 > 12){ hour = hour24 - 12; };
        if(hour24 == 0){ hour = 12; };
        if(hour24 >= 12 && hour24 != 24){ am_pm = "pm"; };
        times_pretty.push(hour + am_pm)
        // console.log("hour:", hour)
    }
    let stn_chart = new Chart(canv, {
        type: 'line',
        data: {
            labels: times_pretty,
            datasets: [
                {
                    label: "Temperature",
                    data: stn_data.map((x) => x.tempf),
                    pointRadius: 0
                },
                {
                    label: 'Wind (mph)',
                    data: stn_data.map((x) => x.windspeedmph),
                    pointRadius: 0
                }
            ]
        }
    })
}