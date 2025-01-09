// Client-side JS for Weather 4 U 2.0
//
// Seth Strumwasser

let cities;
let h_data;
let map;
let select_map_point = {lat: undefined, lon: undefined}
let current_det_page_num;
let seven_day_fc;
let recent_locs = [];

// get recent locs from cookie
function cookies_as_json(){
    let cooks = document.cookie.split("; ");
    let cookies_json = {}
    for (let c of cooks){
        let items = c.split('=');
        cookies_json[items[0]] = items[1]
    }
    return cookies_json
};

const day_abr = {
    Monday: "Mon",
    Tuesday: "Tues",
    Wednesday: "Wed",
    Thursday: "Thurs",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun"
}

// Fetch data and try again until it succeeds. NWS API often returns
// Error 500.
async function fetch_data(url) {
    let m_resp = await fetch(url);
    if(m_resp.ok){
        let m_data = await m_resp.json()
        return m_data;
    }
    else if(m_resp.status == 500) {
        m_resp = await fetch_data(url);
    }
    else {
        // for testing when internet not available
        console.log(`An error occurred: ${m_resp.status}`);
        console.log("Using local dataset for testing purposes.");
        let local_data_resp = await fetch("./json/local_data.json");
        console.log("local_data")
        console.log(local_data_resp)
        let local_data = await local_data_resp.json();
        return local_data;
    }
}

// main function to fetch data and build page layout
async function build_layout(coords) {
    // coords - returned from navigator.geolocation.getCurrentPosition()


    // GRIDPOINTS
    // WAKEFIELD RI - 64,46
    // SOMERVILLE, MA - 70,91

    let lat = coords.latitude;
    let lon = coords.longitude;
    // test
    // let lat = 42;
    // let lon = -91;

    // construct URL
    // use api to get grid nums for lat lon
    let points_url = "https://api.weather.gov/points/" + lat + "," + lon;
    console.log(points_url)
    let points_resp = await fetch_data(points_url);
    console.log('points_resp: ', points_resp)

    // CITY IS GIVEN BY NWS API!!!
    let loc_label = document.querySelector("#location-label");
    loc_label.textContent = points_resp.properties.relativeLocation.properties.city + ", " + points_resp.properties.relativeLocation.properties.state;

    // 7-day forecast url
    let fc_url = points_resp.properties.forecast;
    console.log(fc_url);

    // hourly forecast data
    hourly_url = points_resp.properties.forecastHourly;
    h_data = await fetch_data(hourly_url);
    console.log("hourly forecast data");
    console.log(h_data);
    
    // forecast data
    seven_day_fc = await fetch_data(fc_url);
    console.log("7 day forecast data");
    console.log(seven_day_fc);
    let periods = seven_day_fc.properties.periods;

    // loop through all 14 periods
    for (const [index, period] of periods.entries()){

        // if period is daytime or we're on the first period (which may be night), 
        // build a tile, which contains day and night panes
        if(period.isDaytime || period.number == 1){

            let period_name = period.name;

            // temps for max and min
            let temps = seven_day_fc.properties.periods.map(({temperature}) => temperature);
            let chance_precips = seven_day_fc.properties.periods.map(
                ({probabilityOfPrecipitation}) => probabilityOfPrecipitation.value);
            
            // get max values to set scale range - want this to be the same for side-by-side periods
            let ymax_temp = Math.max(...temps.filter((temp) => !isNaN(temp)));
            let ymax_prec = Math.max(...chance_precips.filter((cp) => !isNaN(cp)));

            let y_scale_max = 1.3 * Math.max(ymax_prec, ymax_temp);

            // day div
            let day_div = document.createElement("div");
            day_div.classList.add("day");
            
            let period_list = document.querySelector("#period-list");
            period_list.append(day_div);

            // day pane container
            let pane_con_day = document.createElement("div");
            pane_con_day.classList.add("pane-container");
            pane_con_day.id = "period-" + period.number;
            pane_con_day.onclick = function(){show_details(pane_con_day.id)};

            // night pane container
            let pane_con_night = document.createElement("div");
            pane_con_night.classList.add("pane-container");
            if(period.number == 1 && !period.isDaytime){pane_con_night.id = "period-" + period.number}
            else{pane_con_night.id = "period-" + (period.number + 1)};            
            pane_con_night.onclick = function(){show_details(pane_con_night.id)};

            day_div.append(pane_con_day, pane_con_night);

            // Add content to panes - first day then night, or just night if the first
            // period is night.
            if (period.isDaytime){
                // build day pane
                build_tile_section(pane_con_day, period, temps);
                
                // detail section
                build_detail_section(period, h_data, y_scale_max)

                // build night pane unless the day period is the last (number 14)
                if(period.number < 14){
                    build_tile_section(pane_con_night, periods[index + 1], temps);
                    
                    // detail section
                    build_detail_section(periods[index + 1], h_data, y_scale_max)
                };
            }
            else {
                build_tile_section(pane_con_night, period, temps);

                // detail section
                build_detail_section(period, h_data, y_scale_max)
            };


            // break ////////////////////////////
        }
    }
    console.log("build_layout done")
}

async function build_page() {
    
    open_loading_screen();

    navigator.geolocation.getCurrentPosition(async (success, error) => {
        if(success){
            console.log(success.coords)

            await build_layout(success.coords);

            // build map
            map = L.map('map-div').setView([39, -95], 3.5);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);
        
            // event listeners for dropdown
            let dropdown_items = document.querySelectorAll(".dropdown-item");
            dropdown_items.forEach((el) => {
                el.addEventListener("click", function(e){
                    let dropdown_button = document.querySelector("#menu-dropdown");
                    dropdown_button.textContent = el.textContent;
                })
            });

            overview(h_data);
            
            cookie_json = JSON.parse(cookies_as_json().recent_locs);
            recent_locs = cookie_json == undefined ? [] : cookie_json;
            console.log(recent_locs);

            // populate recent locations list
            let locs_list = document.querySelector("#recent-locs-list");
            for (loc of recent_locs) {
                let item = document.createElement('div');
                item.classList.add("locs-list-item");
                item.textContent = loc.city + ', ' + loc.state;
                item.addEventListener("click", function(e) {
                    update_data(loc.lat, loc.lon)
                });
                locs_list.append(item)
            }
        
            close_loading_screen();
        } else {
            console.log(error)
        }
    })
}

function build_tile_section(parent_el, period, temps) {

    // get min and max temps
    let min_temp = Math.min.apply(null, temps);
    let max_temp = Math.max.apply(null, temps);

    let temp_el;
    let icon_el;
    let rel_hum_el;
    let wind_el;
    let cha_prec_el;
    let cond_el;

    // Relative Humidity removed June 20th, 2024 because it does not match 12-hour period
    // const rel_hum_text = (() => {if(period.relativeHumidity.value==null) {return "0"} 
    //                 else {return period.relativeHumidity.value}})();
    const cha_prec_text = (() => {if(period.probabilityOfPrecipitation.value==null) {return "0"} 
                    else {return period.probabilityOfPrecipitation.value}})();

    // period name i.e. "Tuesday Night"
    let pname_con = document.createElement("div");
    pname_con.classList.add("pname-con");

    let pname_el = document.createElement("div");
    pname_el.id = "period-name-" + period.number;
    pname_el.classList.add("pname");

    // abbreviate day names
    re = new RegExp(Object.keys(day_abr).join("|"),"gi"); 
    pname_el.textContent = period.name.replace(re, function(matched){
        return day_abr[matched];
      });

    pname_con.append(pname_el);
    
    // temperature element - includes wrapper, bar, and text
    temp_el = document.createElement("div");
    temp_el.classList.add("data");
    temp_el.style.width = "20%";

    // wrapper for bar and temp
    let temp_wrapper = document.createElement("div");
    temp_wrapper.classList.add("temp_wrapper");
    temp_wrapper.style.width = "100%";
    temp_wrapper.style.height = "100%";
    temp_wrapper.style.display = "flex";
    temp_wrapper.style.justifyContent = "center";
    temp_wrapper.style.gap = "10px";
    temp_wrapper.style.alignItems = "center";
    temp_wrapper.style.borderRadius = "25px";

    // temp_bar container
    let temp_bar_con = document.createElement("div");
    temp_bar_con.classList.add('temp-bar-con');
    
    // temp bar
    let temp_bar = document.createElement("div");
    bar_width = Math.round((period.temperature - min_temp) / (max_temp - min_temp) * 100);
    scaled_bar_width = bar_width * 0.8 + 10;
    temp_bar.style.width = String(scaled_bar_width) + "%";
    temp_bar.style.height = "100%";
    temp_bar.style.borderRadius = "25px";
    temp_bar.style.backgroundColor = getColor(period.temperature + 20);

    // temperature text
    let temp_text = document.createElement("div");
    temp_text.id = "temp-" + period.number;
    temp_text.classList.add("temp-text");
    temp_text.innerHTML = period.temperature + "&deg;";

    // icon
    icon_el = document.createElement("div");
    icon_el.classList.add("icon");
    icon_el.id = "icon-" + period.number;
    icon_el = build_icon(period, icon_el);

    // if(cha_prec_text > 0) {
    //     let icon_cha_prec = document.createElement("div");
    //     icon_cha_prec.classList.add("icon-cha-prec");

    //     let raindrop = document.createElement("img");
    //     raindrop.style.height = "100%";
    //     raindrop.src = "./meteocons/raindrop_small.png";

    //     let icon_cha_prec_text = document.createElement("div");
    //     icon_cha_prec_text.classList.add("icon-cha-prec-text");
    //     icon_cha_prec_text.textContent = cha_prec_text + "%";

    //     // icon_cha_prec.append(raindrop);
    //     icon_cha_prec.append(icon_cha_prec_text);
    //     icon_el.append(icon_cha_prec);
    // }

    // short forecast (conditions)
    let cond_text = document.createElement("div");
    cond_text.classList.add("cond-text");
    cond_text.id = "cond-" + period.number;
    cond_text.textContent = period.shortForecast;

    cond_el = document.createElement("div");
    cond_el.style.display = "flex";
    cond_el.style.alignItems = "center";
    cond_el.style.width = "50%";
    cond_el.append(cond_text);

    // wind
    wind_el = document.createElement("div");
    wind_el.classList = "data flex-row-container";

    let wind_dir = document.createElement("div");
    wind_dir.textContent = period.windDirection;
    // wind_dir.style.width = "25%";
    wind_dir.style.textAlign = "center";

    let wind_speed = document.createElement("div");
    wind_speed.textContent = period.windSpeed;
    wind_speed.style.textAlign = "center";
    wind_speed.style.flexGrow = 1;

    wind_el.append(wind_dir)
    wind_el.append(wind_speed)

    // chance of precipitation
    cha_prec_el = document.createElement("div");
    cha_prec_el.textContent = cha_prec_text + " %";
    cha_prec_el.classList.add("data");

    if (cha_prec_text == 0) {
        cha_prec_el.style.color = "#DEDEDE"
        }

    let main_pane = document.createElement("div");
    main_pane.classList.add("main-pane");

    // add period name, icon, temp, cond to main pane
    main_pane.append(pname_con);
    
    temp_wrapper.append(icon_el);
    temp_wrapper.append(temp_text);
    temp_bar_con.append(temp_bar);
    temp_wrapper.append(temp_bar_con);
    
    main_pane.append(temp_wrapper);
    parent_el.append(main_pane);

    // let detail_pane = document.createElement("div");
    // detail_pane.classList.add("detail-pane");
    // detail_pane.style.height = main_pane.clientHeight * 0.4
    // detail_pane.append(cond_el);
    // main_pane.append(detail_pane);
}

function make_active(id, tablink) {
    // unselect current tablink
    let sel_tablink = document.querySelector(".selected");
    sel_tablink.classList.remove("selected");
   
    // update tablink
    tablink.classList.add("selected");

    // turn off current active tab
    let active_tab = document.querySelectorAll(".active");
    active_tab.item(0).classList.remove("active");

    // turn on new active tab
    let new_active = document.querySelector(id);
    new_active.classList.add("active");
}

function build_icon(period, icon_el) {

    icon_el.innerHTML = "";

    let single_icon = period.shortForecast.includes("then") ?
     false : true;
    let icon_img;
    if(single_icon){
        icon_img = document.createElement("img");
        icon_img.classList.add("icon-img");
        icon_img.src = get_icon(period.shortForecast, period.isDaytime);

    } else {
        // container for 2 icons. full height of row, let the width set automatically 
        // when 2 icons are added to it
        let icons_con = document.createElement("div");
        icons_con.style.height = "100%";
        icons_con.style.width = "100%";

        // split shortForecast text on "then"
        let sFore_split = period.shortForecast.split(" then ");
        let cond_1 = sFore_split[0];
        let cond_2 = sFore_split[1];

        let icon_img_top = document.createElement("div");
        icon_img_top.style.height = "50%";
        icon_img_top.style.width = "100%";
        icon_img_top.style.display = "flex";
        icon_img_top.style.justifyContent = "left";

        let icon_top_1 = document.createElement("img");
        icon_top_1.classList.add("icon-img", "icon-img-multiple");
        icon_top_1.src = get_icon(cond_1, period.isDaytime);
        icon_img_top.append(icon_top_1);

        let icon_img_bottom = document.createElement("div");
        icon_img_bottom.style.height = "50%";
        icon_img_bottom.style.width = "100%";
        icon_img_bottom.style.display = "flex";
        icon_img_bottom.style.justifyContent = "right";
        
        let icon_bot_2 = document.createElement("img");
        icon_bot_2.classList.add("icon-img", "icon-img-multiple");
        icon_bot_2.src = get_icon(cond_2, period.isDaytime);
        icon_img_bottom.append(icon_bot_2);

        icons_con.append(icon_img_top);
        icons_con.append(icon_img_bottom);

        icon_img = icons_con;
    }

    icon_el.append(icon_img);

    return icon_el;
}

function get_icon(shortForecast, isDaytime){
    if(isDaytime){
        if (meteocons["meteocons_day"][shortForecast] != undefined) {
            return "./meteocons/" + meteocons["meteocons_day"][shortForecast];
        }
        else {
            return "./meteocons/code-red.png"
        }

    } else {
        if (meteocons["meteocons_night"][shortForecast] != undefined) {
            return "./meteocons/" + meteocons["meteocons_night"][shortForecast];
        }
        else {
            return "./meteocons/code-red.png"
        }
    }
}

function build_detail_section(period, hourly_data, y_scale_max) {
    let detail_pane = document.querySelector("#details");
    
    let detail_section = document.createElement("div");
    detail_section.id = "detail-" + period.number;
    detail_section.classList.add("detail-section");

    // back button (for mobile)
    let back_btn = document.createElement("button");
    back_btn.id = 'detail-back-btn';
    back_btn.classList.add('btn', 'btn-primary');
    back_btn.textContent = "Back";
    back_btn.onclick = function(){
        detail_pane.classList.toggle("mobile-hide");
        let period_list = document.querySelector("#period-list");
        period_list.classList.toggle("mobile-hide");
    }
    detail_section.append(back_btn);

    // title
    let p_title = document.createElement("div");
    p_title.textContent = period.name;
    p_title.classList.add("detail-period-title");

    //short forecast
    let short = document.createElement("div");
    short.textContent = period.shortForecast;
    short.style.textAlign = "center";

    // graph
    let graph_el = document.createElement("div");
    graph_el.id = "graph-" + period.number;
    graph_el.classList.add("graph-div");

    // next/previous buttons
    let next_btn = document.createElement('button');
    next_btn.classList.add("btn", "btn-primary");
    next_btn.textContent = "Next";
    next_btn.onclick = function(){navigate_detail_pages(current_det_page_num, 1)};
    let prev_btn = document.createElement('button');
    prev_btn.classList.add("btn", "btn-primary");
    prev_btn.textContent = "Previous";
    prev_btn.onclick = function(){navigate_detail_pages(current_det_page_num, -1)};

    let np_con = document.createElement("div");
    np_con.classList.add("d-flex", "justify-content-evenly", "np-con");
    np_con.append(prev_btn, next_btn);
        
    detail_section.append(p_title);
    detail_section.append(short);
    detail_section.append(graph_el);
    detail_section.append(np_con);
    detail_pane.append(detail_section);

    // make first period visible
    if(period.number == 1){
        detail_section.style.display = "block";
    }

    hourly_chart(hourly_data.properties.periods, period, y_scale_max)

    return detail_section;

}

function hourly_chart(h_periods, period, y_scale_max) {
    
    let period_number = period.number;

    let canv = document.createElement("canvas");
    canv.classList.add("chart-canvas");
    let graph_div = document.querySelector("#graph-" + period_number);
    graph_div.appendChild(canv);

    // set up datasets
    //
    // get hourly forecasts for the current period
    let period_start_time = period.startTime;
    let period_end_time = period.endTime;

    // get first index
    let hour_indices_start;
    if(period.number == 1){
        hour_indices_start = 0;
    } else {
        // filter returns an array, so we get the first item in that array
        let period_start_hour_array = h_periods.filter((h_period) => h_period.startTime == period_start_time)[0];
        hour_indices_start = h_periods.indexOf(period_start_hour_array) - 1;
    }

    // get last index
    // filter returns an array, so we get the first item in that array
    let period_end_hour_array = h_periods.filter((h_period) => h_period.startTime == period_end_time)[0];
    let hour_indices_end = h_periods.indexOf(period_end_hour_array) - 1;

    let hourly_periods = h_periods.slice(hour_indices_start, hour_indices_end);
    if(hourly_periods.length == 0){hourly_periods = [h_periods[0]]};

    // get temperature and time for each hour
    let temps = []
    let times = []
    let chance_precips = []
    for(period of hourly_periods) {
        temps.push(period.temperature);
        times.push(period.startTime);
        let cha_prec = (() => {if(period.probabilityOfPrecipitation.value==0) {return NaN} 
                    else {return period.probabilityOfPrecipitation.value}})();
        // let cha_prec = period.probabilityOfPrecipitation.value;
        chance_precips.push(cha_prec);
    }
    // console.log(temps);
    // console.log(times);
    // console.log(chance_precips);

    // get times as HHam/HHpm
    let times_pretty = [];
    for(time of times){
        // get time from period.startTime
        let date_ts = Date.parse(time);
        let date = new Date(date_ts);
        let hour24 = date.getHours() + 1;
        let am_pm = "am";
        let hour = hour24;
        if(hour24 > 12){ hour = hour24 - 12; };
        if(hour24 >= 12 && hour24 != 24){ am_pm = "pm"; };
        times_pretty.push(hour + am_pm)
    }

    // fill in NAs for time spans that are not full. For the first period (coinciding with right now) there
    // may not be 12 hours worth of data. Want to make the chart look the same anyway (with no bars for missing hours).
    if (times_pretty.length < 12) {
        let num_missing = 12 - times_pretty.length;
        for(i of [...Array(num_missing).keys()]) {
            let z = 12 - num_missing - i;
            times_pretty.splice(0, 0, '');
            temps.splice(0, 0, NaN);
            chance_precips.splice(0, 0, NaN);
        }
    }

    // build chart
    Chart.defaults.color = "white";
    Chart.defaults.backgroundColor = "rgba(255, 255, 255, 0.25)";
    Chart.register(ChartDataLabels);

    new Chart(canv,
        {
            type: "bar",
            data: {
                labels: times_pretty,
                datasets: [{
                    label: "Temp",
                    data: temps
                },
                {
                    label: "Precip",
                    data: chance_precips,
                    type: "line",
                    borderColor: "#7ad0f0"
                }
            ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // interaction: {
                //     intersect: false,
                //     mode: 'index',
                // },
                color: "white",
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawOnChartArea: false
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        display: false,
                        max: y_scale_max
                    }
                },
                plugins: {
                    datalabels: {
                        color: function(context) {
                            return context.dataset.borderColor;
                        },
                        // color: "white",
                        anchor: "end",
                        align: "end",
                        offset: 2,
                        formatter: (value, context) => { 
                            if (context.dataset.label == "Temp"){
                                return !isNaN(value) ? value + "°" : '' ;
                            } else {
                                return !isNaN(value) ? value + "%" : '' ;
                            }
                        },
                    },
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                        text: "Hourly Forecast"
                    }
                },
                animation: false,
                layout: {
                    padding: {
                        top: 10
                    }
                }
            }
        }
    )
}

function show_details(pane, toggle=true) {
    let period_num = pane.split("-")[1]

    // hide detail sections
    let d_sections = document.querySelectorAll(".detail-section");
    d_sections.forEach((el) => {el.style.display = "none"})

    // show detail section
    current_det_page_num = period_num;
    let detail_section = document.querySelector("#detail-" + period_num);
    detail_section.style.display = "block";

    if(toggle){
        toggle_show_hide_mobile_pages();
    }
}

function toggle_show_hide_mobile_pages(){
    /**
     * Either show the period list and hide the detail pane or visa versa. Uses toggle on "mobile-hide" class.
     */
    
    let tile_section = document.querySelector("#period-list");
    tile_section.classList.toggle("mobile-hide");

    let details_pane = document.querySelector("#details");
    details_pane.classList.toggle("mobile-hide");
}

function navigate_detail_pages(current_det_page_num_param, next_prev){
    /**
     * Navigates to the next or previous detail page.
     * 
     * @param {Number} current_det_page_num_param The period number currently displaying a detail page.
     * @param {Number} next_prev 1 to move to next period, -1 to move to previous.
     */

    let dest_period_num = Number(current_det_page_num_param) + Number(next_prev);
    console.log("dest_period_num: ", dest_period_num)
    if(dest_period_num < 1 || dest_period_num > 14){
        return;
    }
    show_details("details-" + dest_period_num, false);
}

async function update_data(new_lat, new_lon) {
    try{
        console.log("Updating data")
        // make loading icon visible
        let spinner = document.querySelector("#spinner");
        spinner.style.display = "block";
    
        let new_city_name;
        let new_state_name;
        if(new_lat == undefined){
            // get value of location input
            let loc_in = document.querySelector("#location-input");
            let new_loc = loc_in.value;
            let new_cities = await cities;
        
            // get coordinates of location
            let new_loc_split = new_loc.split(", ");
            new_city_name = new_loc_split[0];
            new_state_name = new_loc_split[1];
            let new_city = new_cities.data.filter(
                (city) => (city[0] == new_city_name && city[1] == new_state_name));
            console.log(new_city)
        
            new_lat = new_city[0][2];
            new_lon = new_city[0][3];
        }
    
        // construct new URL
        // use api to get grid nums of new lat lon
        let new_points_url = "https://api.weather.gov/points/" + new_lat + "," + new_lon;
        console.log(new_points_url)
    
        // fetch data - get gridpoints
        let new_points_data = await fetch_data(new_points_url);
        let new_url = new_points_data.properties.forecast;
        console.log(new_url);
    
        // get forecast with new gridpoints
        let new_data = await fetch_data(new_url);
        console.log(new_data)
    
        let new_periods = new_data.properties.periods;
    
        // hourly
        let new_h_periods = await fetch_data(new_url + "/hourly");
    
        // update page elements
        for(nPeriod of new_periods) {
    
            // period names
            let pname_el = document.querySelector("#period-name-" + nPeriod.number);
            re = new RegExp(Object.keys(day_abr).join("|"),"gi"); 
            pname_el.textContent = nPeriod.name.replace(re, function(matched){
                return day_abr[matched];
            });
    
            // icon
            let icon_el = document.querySelector("#icon-" + nPeriod.number);
            build_icon(nPeriod, icon_el);
    
            // temperature
            let temp_text = document.querySelector("#temp-" + nPeriod.number);
            temp_text.innerHTML = nPeriod.temperature + "&deg;"
    
            // temps for max and min
            let temps = new_data.properties.periods.map(({temperature}) => temperature);
            let chance_precips = new_data.properties.periods.map(
                ({probabilityOfPrecipitation}) => probabilityOfPrecipitation.value);
    
            // get max values to set scale range - want this to be the same for side-by-side periods
            let ymax_temp = Math.max(...temps.filter((temp) => !isNaN(temp)));
            let ymax_prec = Math.max(...chance_precips.filter((cp) => !isNaN(cp)));
    
            let y_scale_max = 1.3 * Math.max(ymax_prec, ymax_temp);
    
    
            // conditions
            // console.log(nPeriod.number)
            // let cond_text = document.querySelector("#cond-" + nPeriod.number);
            // cond_text.innerHTML = nPeriod.shortForecast;
    
    
            // graph
            //
            // clear graph
            let graph_div = document.querySelector("#graph-" + nPeriod.number);
            graph_div.innerHTML = "";
            hourly_chart(new_h_periods.properties.periods, nPeriod, y_scale_max);
    
            // detailed forecast
            // console.log("det_fc query: ", "#detail-" + nPeriod.number + " #detailed-forecast")
            // let det_fc = document.querySelector("#detail-" + nPeriod.number + " .detailed-forecast");
            // det_fc.textContent = nPeriod.detailedForecast;
        }    
    
        // update overview
        overview(new_h_periods)
    
        // update afd
        let new_wfo = new_points_data.properties.cwa;
        update_afd(new_wfo);
    
        // disable loader
        spinner.style.display = "none";
    
        // change location label
        let loc_label = document.querySelector("#location-label");
        try{
            loc_label.textContent = new_points_data.properties.relativeLocation.properties.city + ", " + new_points_data.properties.relativeLocation.properties.state;
        } catch (e){
            console.log("Error setting location label:", e);
            try{
                let new_lat_str = String(new_lat.toFixed(4));
                let new_lon_str = String(new_lon.toFixed(4));
                loc_label.textContent = new_lat_str + ", " + new_lon_str;
            } catch (e) {
                console.log("Another error:", e);
                loc_label.textContent = "[location]"
            }
        };

        // add new location to recent_locs list
        recent_locs.push({
            lat: new_lat,
            lon: new_lon,
            city: new_points_data.properties.relativeLocation.properties.city,
            state: new_points_data.properties.relativeLocation.properties.state
        });

        // add to recent_locs cookie
        document.cookie = "recent_locs=" + JSON.stringify(recent_locs);
    
        console.log("done updating data")
    } catch (e) {
        console.error(e);
        alert(e)
    }
    
}

async function get_cities() {
    // cities data
    const city_fetch = await fetch("./data/city_coords.csv");
    const city_body = await city_fetch.text();
    cities = Papa.parse(city_body);

    // activate city search button
    let go = document.querySelector("#go-button");
    go.disabled = false;

    // add cities to datalist
    let datalist = document.querySelector("#cities_list");
    let html_str = ""
    for(city of cities.data){
        if(!city.includes("city")){
        html_str += "<option>" + city[0] + ", " + city[1] + "</option>";
        }
    }

    datalist.innerHTML = html_str;

    console.log("cities");
    console.log(cities);

    return cities;
} get_cities()

async function enter_loc() {
    if(event.key == "Enter") {
        document.querySelector("#go-button").click();
    }
}

const afd_url = "https://api.weather.gov/products/types/AFD/locations/BOX"

const b_words = [
    "HOT",
    "HEAT",
    "WARM",
    "WARMTH",
    "MILD",
    "COOL",
    "COLD",

    " RAIN ",
    "RAINY",
    " SHOWER ",
    "SHOWERS",
    "DRY",

    "THUNDERSTORM ",
    "THUNDERSTORMS",
    "LIGHTNING",
    "INSTABILITY",
    "STORMS",

    " STRONG ",
    "SEVERE",
    "UNSETTLED",

    "WINDY",
    "BREEZY",
    "BREEZE",

]

async function get_afd() {
    const data = await fetch_data(afd_url);
    console.log(data);

    let last_afd = data["@graph"][0].id;

    let prod_url = "https://api.weather.gov/products/";
    let last_afd_url = prod_url + last_afd;

    const last_afd_data = await fetch_data(last_afd_url);

    // temporary simple display
    let afd_text = document.querySelector("#afd-text");
    afd_text.textContent = last_afd_data.productText;

    // Build AFD sections
    // let afd_split = last_afd_data.productText.split("&&")

    // for(section of afd_split){
    //     // remove credits section
    //     if(section.includes("$$")){
    //         continue
    //     }

    //     if(section.includes("SYNOPSIS")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let syn_acc_button = document.querySelector("#synopsis-acc-button");
    //         for(line of section_splitlines){
    //             if(line.includes("SYNOPSIS")){syn_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
            
    //         let acc_synopsis = document.querySelector("#acc-synopsis");
    //         acc_synopsis.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }

    //     if(section.includes("NEAR TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let near_term_acc_button = document.querySelector("#near-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){
    //                 near_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break
    //             }
    //         }
            

    //         let acc_near_term = document.querySelector("#acc-near-term");
    //         acc_near_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
        
    //     if(section.includes("SHORT TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let short_term_acc_button = document.querySelector("#short-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){short_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
            
    //         let acc_short_term = document.querySelector("#acc-short-term");
    //         acc_short_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
    //     if(section.includes("LONG TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let long_term_acc_button = document.querySelector("#long-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){long_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
    //         let acc_long_term = document.querySelector("#acc-long-term");
    //         acc_long_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
    // }

}
async function update_afd(new_wfo) {

    // get new afd data
    let new_afd_url = "https://api.weather.gov/products/types/AFD/locations/" + new_wfo;
    const data = await fetch_data(new_afd_url);

    let last_afd = data["@graph"][0].id;

    let prod_url = "https://api.weather.gov/products/";
    let last_afd_url = prod_url + last_afd;

    const last_afd_data = await fetch_data(last_afd_url);

    // temporary simple display
    let afd_text = document.querySelector("#afd-text");
    afd_text.textContent = last_afd_data.productText;

    // Update AFD sections
    // let afd_split = last_afd_data.productText.split("&&")

    // for(section of afd_split){
    //     // remove credits section
    //     if(section.includes("$$")){
    //         continue
    //     }

    //     if(section.includes("SYNOPSIS")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let syn_acc_button = document.querySelector("#synopsis-acc-button");
    //         for(line of section_splitlines){
    //             if(line.includes("SYNOPSIS")){syn_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
            
    //         let acc_synopsis = document.querySelector("#acc-synopsis");
    //         acc_synopsis.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }

    //     if(section.includes("NEAR TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let near_term_acc_button = document.querySelector("#near-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){
    //                 near_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break
    //             }
    //         }
            

    //         let acc_near_term = document.querySelector("#acc-near-term");
    //         acc_near_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
        
    //     if(section.includes("SHORT TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let short_term_acc_button = document.querySelector("#short-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){short_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
            
    //         let acc_short_term = document.querySelector("#acc-short-term");
    //         acc_short_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
    //     if(section.includes("LONG TERM")){
    //         let section_splitlines = section.split(/[\r\n]+/);
            
    //         let long_term_acc_button = document.querySelector("#long-term-acc-button");
    //         for(line of section_splitlines){
    //             if(line != ""){long_term_acc_button.innerHTML = line; 
    //                 section.replace(line, '');
    //                 break}
    //         }
    //         let acc_long_term = document.querySelector("#acc-long-term");
    //         acc_long_term.innerHTML = "<p style='white-space: pre-line;'>" + 
    //                                     bold_words(section) + 
    //                                     "</p>";
    //     }
    // }

}

function bold_words(section) {
    let b_section = section;
    b_words.forEach((word) => {
        const regex = new RegExp(word, "i");
        b_section = b_section.replace(regex, "<strong>" + word.toLowerCase() + "</strong>");

        // capitalize first letter if necessary
        const cap_regex = new RegExp(/(?<=\. )([a-z])/, "g");
        function replacer(match) { return match.toUpperCase() }
        b_section = b_section.replace(cap_regex, replacer);
    });
    return b_section;
}

function range(min, max) {
    var len = max - min + 1;
    var arr = new Array(len);
    for (var i=0; i<len; i++) {
      arr[i] = min + i;
    }
    return arr;
  }

function map_select() {
    // switch to 7-day tab
    let seven_day_tablink = document.querySelector("#seven-day-dropdown-item");
    make_active("#seven-day-tab", seven_day_tablink);

    // hide detail sections
    let d_sections = document.querySelectorAll(".detail-section");
    d_sections.forEach((el) => {el.style.display = "none"})

    // show map
    const map_select_div = document.querySelector("#map-select-div");
    map_select_div.style.display = "block";

    // show detail section for mobile
    let details = document.querySelector("#details");
    details.classList.remove("mobile-hide");

    let period_list = document.querySelector("#period-list");
    period_list.classList.add("mobile-hide");

    // ensure resize event triggered
    map.invalidateSize();

    // change cursor
	L.DomUtil.addClass(map._container, "crosshair-cursor");

    // on click, add point
	let temp_marker_lat;
	let temp_marker_lng;
    let adding_point = true;
	map.on('click', function(ev){
		if(adding_point){
			console.log(ev);

			// set lat lng in form
			temp_marker_lat = ev.latlng.lat;
			temp_marker_lng = ev.latlng.lng;
			// let add_table_lng = document.getElementById('select-lng');
			// let add_table_lat = document.getElementById('select-lat');
			// add_table_lat.value = Math.round(ev.latlng.lat * 100000) / 100000;
			// add_table_lng.value = Math.round(ev.latlng.lng * 100000) / 100000;

			// add temporary marker to the map
			let temp_marker = L.marker([temp_marker_lat, temp_marker_lng], {
				icon: L.divIcon({
					className: 'temp-marker'
				})
			});
			temp_marker.addTo(map);

			adding_point = false;
			L.DomUtil.removeClass(map._container, "crosshair-cursor")

            // enable "Select" button
            let select_button = document.querySelector("#select-button");
            select_button.disabled = false;

            // set global variable with coordinates
            select_map_point.lat = temp_marker_lat;
            select_map_point.lon = temp_marker_lng;
		}
	});
}

async function select_map_loc() {
    // populate location input
    input_text = String(select_map_point.lat) + ", " + String(select_map_point.lon);
    let loc_in = document.querySelector("#location-input");
    loc_in.value = input_text;

    // loading screen
    open_loading_screen()

    // load new data
    await update_data(select_map_point.lat, select_map_point.lon);

    // hide loading screen
    close_loading_screen()

    // close map
    close_map();
}

function close_map() {
    show_details("detail-default", toggle=false);

    // for mobile, show period list
    let details = document.querySelector("#details");
    details.classList.add("mobile-hide");

    let period_list = document.querySelector("#period-list");
    period_list.classList.remove("mobile-hide");
}

function open_loading_screen() {
    console.log("open_loading_screen")
    let ls = document.querySelector("#loading-screen");
    ls.style.display = "flex";
    ls.style.zIndex = 1000;
}

function close_loading_screen() {
    console.log("close_loading_screen")
    let ls = document.querySelector("#loading-screen");
    ls.style.display = "none";
}

function change_location() {

}

async function enter_city_go_button() {
    // loading screen
    open_loading_screen()

    // load new data
    await update_data(select_map_point.lat, select_map_point.lon);

    // hide loading screen
    close_loading_screen()

    // switch to 7-day tab
    let seven_day_tablink = document.querySelector("#seven-day-dropdown-item");
    make_active("#seven-day-tab", seven_day_tablink);
}
