let dows = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
}

let canv;
let overview_chart;

function overview(h_data) {
    let hourly_periods = h_data.properties.periods;

    // build chart
    let chart_div = document.querySelector("#overview");
    chart_div.classList.add("overview-chart-container");
    if(document.querySelector(".chart-canvas-overview") == undefined){
        canv = document.createElement("canvas");
        canv.classList.add("chart-canvas-overview");
        chart_div.append(canv);
    } else {
        canv = document.querySelector(".chart-canvas-overview");
        overview_chart.destroy()
    }

    // set up datasets

    // get temperature and time for each hour
    let temps = [];
    let times = [];
    let days= [];
    let chance_precips = [];
    for(period of hourly_periods) {
        temps.push(period.temperature);
        times.push(period.startTime);
        let cha_prec = (() => {if(period.probabilityOfPrecipitation.value==0) {return NaN} 
                    else {return period.probabilityOfPrecipitation.value}})();
        // let cha_prec = period.probabilityOfPrecipitation.value;
        chance_precips.push(cha_prec);

        let start_time = period.startTime;
        let date_ts = Date.parse(start_time);
        let date = new Date(date_ts);
        // console.log(date)
        let dow = date.getDay()
        days.push(dows[dow]);
    }
    // console.log(temps);
    // console.log(times);
    // console.log(chance_precips);
    // console.log(days);

    // get times as HHam/HHpm
    let times_pretty = [];
    for(let time of times){
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

    // labels so we can have days labeled too
    let times_pretty_with_days = [];
    for(let [index, time] of times_pretty.entries()){
        // console.log(index)
        // console.log(time)
        times_pretty_with_days.push(time + ";" + days[index])
    }

    // let ymax = Math.max(temps) + 0.1 * Math.max(temps);
    // let ymax = Math.max(...temps.filter((temp) => !isNaN(temp)));
    // let y_scale_max = ymax + 10;

    // get max values to set scale range
    let ymax_temp = Math.max(...temps.filter((temp) => !isNaN(temp)));
    let ymax_prec = Math.max(...chance_precips.filter((cp) => !isNaN(cp)));

    let y_scale_max = 1.3 * Math.max(ymax_prec, ymax_temp);

    // build chart
    let main_blue = "#4992d1";
    let precip_blue = "#75d6ff"
    // Chart.defaults.color = main_blue;
    // Chart.defaults.backgroundColor = main_blue;
    Chart.register("chartjs-plugin-annotation");

    // build day box annotations
    let day_annotations = [];
    let prev_day = times_pretty_with_days[0].split(";")[1];
    let draw_box = true; // toggler for alternating boxes
    for (time of times_pretty_with_days) {
        let day = time.split(";")[1];
        let xMin;
        let xMax;
        if (day != prev_day) {
            xMin = times_pretty_with_days.indexOf(time);
            if(draw_box){
                // if draw_box is true, add annotaiton to list
                day_annotations.push({
                    type: 'box',
                    drawTime: "beforeDatasetsDraw",
                    xMin: xMin,
                    xMax: xMin + 24,
                    yMin: 0,
                    yMax: y_scale_max,
                    backgroundColor: "#69686840",
                    borderColor: "#69686840"
                })
                draw_box = false;
            } else {
                // if draw_box is false, don't add annotation but set it to true
                draw_box = true;
            }
        }
        prev_day = day;
    }


    overview_chart = new Chart(canv,
        {
            type: "line",
            data: {
                labels: times_pretty_with_days,
                datasets: [{
                    label: "Temp",
                    data: temps,
                    xAxisID: "x1",
                    pointBackgroundColor: main_blue,
                    hoverBackgroundColor: "yellow",
                    borderColor: main_blue,
                    hoverRadius: 10
                    },
                    {
                    label: "Precip",
                    data: chance_precips,
                    xAxisID: "x1",
                    type: "line",
                    pointBackgroundColor: precip_blue,
                    hoverBackgroundColor: "yellow",
                    borderColor: precip_blue,
                    hoverRadius: 10
                    }
            ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x1:{
                          type:"category",
                          ticks:{
                            callback:function(value, index, ticks){
                                let label = this.getLabelForValue(value);
                                var hour = String(label).split(";")[0];
                                var day = String(label).split(";")[1];
                                if(["9am", "12pm", "3pm", "6pm", "9pm",
                                    "12am", "3am", "6am"].includes(hour))
                                    {return hour}
                                else{
                                    return '';
                                }
                            },
                            autoSkip: false
                          }
                        },
                    x2:{
                          type:"category",
                          gridLines: {
                            drawOnChartArea: false, // only want the grid lines for one axis to show up
                          },
                          ticks:{
                            callback:function(value, index, ticks){
                                let label = this.getLabelForValue(value);
                                var hour = String(label).split(";")[0];
                                var day = String(label).split(";")[1];
                              if(hour === "2pm"){
                                return day;
                              }else{
                                return "";
                              }
                            },
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0
                          }
                        },
                    
                    y: {
                        grid: {
                            display: true
                        },
                        display: true,
                        max: y_scale_max
                    }
                },
                plugins: {
                    datalabels: {
                        labels: {
                            high: {
                                color: function(context) {
                                    return context.dataset.borderColor;
                                },
                                anchor: "center",
                                align: "end",
                                offset: 2,
                                font:
                                    {
                                        size: "20pt"
                                    },
                                formatter: (value, context) => { 
        
                                    // temperature labels
                                    if(context.dataset.label == "Temp"){
                                        let this_index = context.dataIndex;
                                        let forward_i = this_index + 12;
                                        let backward_i = this_index - 12;
                                        
                                        // build array of temperatures over 24 period centered on current hour
                                        let temps = [];
                                        for(let i of range(backward_i, forward_i)){
                                            temps.push(context.dataset.data[i])
                                        }
                                        let max_24h = Math.max(...temps.filter((temp) => !isNaN(temp)));
                                        // console.log(max_24h);
                                        let previous_temp = context.dataset.data[context.dataIndex - 1];
                                        if (value == max_24h && value != previous_temp){
                                            return value + "°";
                                        }else{
                                            return ''
                                        };
                                    }
                                    else{return '' }
                                },
                            },
                            low: {
                                color: function(context) {
                                    return context.dataset.borderColor;
                                },
                                anchor: "center",
                                align: "start",
                                offset: 2,
                                font:
                                    {
                                        size: "20pt"
                                    },
                                formatter: (value, context) => { 
        
                                    // temperature labels
                                    if(context.dataset.label == "Temp"){
                                        let this_index = context.dataIndex;
                                        let forward_i = this_index + 12;
                                        let backward_i = this_index - 12;
                                        
                                        // build array of temperatures over 24 period centered on current hour
                                        let temps = [];
                                        for(let i of range(backward_i, forward_i)){
                                            temps.push(context.dataset.data[i])
                                        }
                                        let min_24h = Math.min(...temps.filter((temp) => !isNaN(temp)));
                                        // console.log(max_24h);
                                        let previous_temp = context.dataset.data[context.dataIndex - 1];
                                        if (value == min_24h && value != previous_temp){
                                            return value + "°";
                                        }else{
                                            return ''
                                        };
                                    }
                                    else{return '' }
                                },
                            },
                            high_prec: {
                                color: function(context) {
                                    return context.dataset.borderColor;
                                },
                                anchor: "center",
                                align: "end",
                                offset: 2,
                                font:
                                    {
                                        size: "14pt"
                                    },
                                formatter: (value, context) => { 
        
                                    // precip chances labels
                                    if(context.dataset.label == "Precip"){
                                        let this_index = context.dataIndex;
                                        let forward_i = this_index + 5;
                                        let backward_i = this_index - 5;
                                        
                                        // build array of temperatures over 24 period centered on current hour
                                        let percs = [];
                                        for(let i of range(backward_i, forward_i)){
                                            percs.push(context.dataset.data[i])
                                        }
                                        max_24h = Math.max(...percs.filter((perc) => !isNaN(perc)));
                                        // console.log(max_24h);
                                        let previous_perc = context.dataset.data[context.dataIndex - 1];
                                        if (value == max_24h && value != previous_perc){
                                            labeled = true;
                                            return value + "%";
                                        }else{
                                            return ''
                                        };
                                    }
                                    else{return '' }
                                },
                            },
                            low_prec: {
                                color: function(context) {
                                    return context.dataset.borderColor;
                                },
                                anchor: "center",
                                align: "start",
                                offset: 2,
                                font:
                                    {
                                        size: "14pt"
                                    },
                                formatter: (value, context) => { 
        
                                    // precip chances labels
                                    if(context.dataset.label == "Precip"){
                                        let this_index = context.dataIndex;
                                        let forward_i = this_index + 5;
                                        let backward_i = this_index - 5;
                                        
                                        // build array of temperatures over 24 period centered on current hour
                                        let percs = [];
                                        for(let i of range(backward_i, forward_i)){
                                            percs.push(context.dataset.data[i])
                                        }
                                        min_24h = Math.min(...percs.filter((perc) => !isNaN(perc)));
                                        // console.log(max_24h);
                                        let previous_perc = context.dataset.data[context.dataIndex - 1];
                                        if (value == min_24h && value != previous_perc){
                                            labeled = true;
                                            return value + "%";
                                        }else{
                                            return ''
                                        };
                                    }
                                    else{return '' }
                                },
                            }
                        }
                        
                    },
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                        text: "Hourly Forecast"
                    },
                    tooltip: {
                        position: "nearest"
                    },
                    annotation: {
                        annotations: day_annotations
                    }
                },
                animation: true,
                layout: {
                    padding: {
                        top: 10
                    }
                },
                // hover: {
                //     interaction: {
                //         mode: "nearest"
                //     }
                // }
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false
                }
            }
        }
    )
}
