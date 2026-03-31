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
                    pointRadius: 0,
                    borderColor: '#356ea1'
                },
                {
                    label: 'Wind (mph)',
                    data: stn_data.map((x) => x.windspeedmph),
                    pointRadius: 0,
                    borderColor: 'lightgrey'
                },
                {
                    label: 'Wind Gust (mph)',
                    data: stn_data.map((x) => x.windgustmph > x.windspeedmph ? x.windgustmph : null),
                    // pointRadius: 0,
                    type: 'scatter',
                    pointBackgroundColor: 'grey'
                },
                {
                    label: 'Humidity',
                    data: stn_data.map((x) => x.humidity),
                    pointRadius: 0,
                    borderColor: '#59636b'
                },
                {
                    label: 'Indoor Temp',
                    data: stn_data.map((x) => x.tempinf),
                    pointRadius: 0,
                    borderColor: '#805025',
                    hidden: true
                }
            ]
        },
        options: {
            interaction: {
                mode: "nearest",
                axis: "x",
                intersect: false
            }
        }
    })
}