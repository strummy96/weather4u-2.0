async function getHourlyData(lat, lon, model) {
    const resp = await fetch("https://api.open-meteo.com/v1/forecast?" +
        "latitude=" + lat +
        "&longitude=" + lon +
        "&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,wind_speed_10m" +
        "&temperature_unit=fahrenheit" + 
        "&wind_speed_unit=mph" + 
        "&precipitation_unit=inch" +
        "&timezone=America%2FNew_York" +
        "&models=" + model
    );

    const data = await resp.json();

    return data;
};

async function getDailyData(lat, lon, model) {
    const resp = await fetch("https://api.open-meteo.com/v1/forecast?" +
        "latitude=" + lat +
        "&longitude=" + lon +
        "&daily=temperature_2m_max,temperature_2m_min" +
        "&temperature_unit=fahrenheit" + 
        "&wind_speed_unit=mph" + 
        "&precipitation_unit=inch" +
        "&timezone=America%2FNew_York" +
        "&models=" + model
    );

    const data = await resp.json();

    return data;
}

async function build_hourly_plot() {
    let data = await getHourlyData(42.388455413011265, -71.1034932594401, 'ecmwf_ifs025');
    console.log(data);

    let time = data.hourly.time

    const chart_data = [
        {
            x: time,
            y: data.hourly.temperature_2m,
            type: 'line'
        },
        {
            x: time,
            y: data.hourly.wind_speed_10m,
            type: 'line'
        }
    ];

    Plotly.newPlot('plot', chart_data)
};

async function build_daily_plot() {

    let chart_data = [];

    // for each model, get data and add to data object
    for (model of ['ecmwf_ifs025', 'gfs_seamless', 'icon_global', 'gem_seamless']) {
        let data = await getDailyData(42.388455413011265, -71.1034932594401, model);
        console.log(data);
    
        let time = data.daily.time

        // fix base issue
        let bar_height = data.daily.temperature_2m_max.map((x, i) => {return x - data.daily.temperature_2m_min[i]})
    
        const model_data = {
                x: time,
                y: bar_height,
                base: data.daily.temperature_2m_min,
                type: 'bar',
                name: model,
                marker: {
                    // pattern: {
                    //     shape: '+'
                    // },
                    line: {
                        color: '#123456'
                    }
                }
            };
        chart_data.push(model_data)
    }

    Plotly.newPlot('plot', chart_data)
}