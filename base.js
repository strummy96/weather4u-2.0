
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
        let local_data_resp = fetch("./json/local_data.json");
        let local_data = await local_data_resp.json();
        return local_data;
    }
}

// main function to fetch data and build page layout
async function build_layout() {

    meteocons = await get_mcons();
    meteocons_day = meteocons["meteocons_day"];
    meteocons_night = meteocons["meteocons_night"];

    // hourly forecast data
    wakefield_hourly_url = "https://api.weather.gov/gridpoints/BOX/64,46/forecast/hourly";
    const h_data = await fetch_data(wakefield_hourly_url);
    // const h_data = await h_resp.json();
    console.log("hourly forecast data");
    console.log(h_data);
    
    // forecast data
    let wakefield_url = "https://api.weather.gov/gridpoints/BOX/64,46/forecast";
    const data = await fetch_data(wakefield_url);
    // const data = await resp.json();
    console.log("7 day forecast data");
    console.log(data);
    let periods = data.properties.periods;

    // loop through all 14 periods
    for (const [index, period] of periods.entries()){

        // if period is daytime or we're on the first period (which may be night), 
        // build a tile, which contains day and night panes
        if(period.isDaytime || period.number == 1){

            let period_name = period.name;

            // temps for max and min
            let temps = data.properties.periods.map(({temperature}) => temperature);

            // day div
            let day_div = document.createElement("div");
            day_div.classList.add("day");

            // day pane
            let day_pane = document.createElement("div");
            day_pane.classList.add("day-night-pane");

            // night pane
            let night_pane = document.createElement("div");
            night_pane.classList.add("day-night-pane");

            // Add content to panes - first day then night, or just night if the first
            // period is night.
            if (period.isDaytime){
                // build day pane
                build_tile_section(day_pane, period, temps, meteocons_day, meteocons_night);
                // build_accordion_body_section(tile_acc_body, period, h_data, y_scale_max)

                // build night pane unless the day period is the last (number 14)
                if(period.number < 14){
                    build_tile_section(night_pane, periods[index + 1], temps, meteocons_day, meteocons_night);
                    // build_accordion_body_section(tile_acc_body, periods[index + 1], h_data, y_scale_max);
                };

                // add panes to correct day div
                day_div.append(day_pane, night_pane);
            }
            else {
                build_tile_section(night_pane, period, temps, meteocons_day, meteocons_night);
                day_div.append(night_pane);
                // let body_sec = build_accordion_body_section(tile_acc_body, period, h_data, y_scale_max);

                // add class to body section to make full width of tile
                // body_sec.classList.add("single")
            };
            let period_list = document.querySelector("#period-list");
            period_list.append(day_div);
        }
    }
}

function build_tile_section(parent_el, period, temps, meteocons_day, meteocons_night) {

    // get min and max temps
    let min_temp = Math.min.apply(null, temps);
    let max_temp = Math.max.apply(null, temps);

    let temp_el;
    let icon_el;
    let rel_hum_el;
    let wind_el;
    let cha_prec_el;
    let cond_el;

    const rel_hum_text = (() => {if(period.relativeHumidity.value==null) {return "0"} 
                    else {return period.relativeHumidity.value}})();
    const cha_prec_text = (() => {if(period.probabilityOfPrecipitation.value==null) {return "0"} 
                    else {return period.probabilityOfPrecipitation.value}})();

    // period name i.e. "Tuesday Night"
    let pname_el = document.createElement("div");
    pname_el.id = "period-name-" + period.number;
    pname_el.textContent = period.name;
    pname_el.style.padding = "5px";
    
    // temperature element - includes wrapper, bar, and text
    temp_el = document.createElement("div");
    temp_el.classList.add("data");
    temp_el.style.width = "20%";

    // wrapper for bar and temp
    let temp_wrapper = document.createElement("div");
    temp_wrapper.style.width = "100%";
    temp_wrapper.style.height = "100%";
    temp_wrapper.style.display = "flex";
    temp_wrapper.style.justifyContent = "center";
    temp_wrapper.style.gap = "10px";
    temp_wrapper.style.alignItems = "center";
    temp_wrapper.style.borderRadius = "25px";

    // temp_bar container
    let temp_bar_con = document.createElement("div");
    temp_bar_con.style.backgroundColor = "#f5f5f5";
    temp_bar_con.style.width = "100%";
    temp_bar_con.style.height = "10px";
    temp_bar_con.style.borderRadius = "25px";
    
    // temp bar
    let temp_bar = document.createElement("div");
    bar_width = Math.round((period.temperature - min_temp) / (max_temp - min_temp) * 100);
    scaled_bar_width = bar_width * 0.8 + 10;
    temp_bar.style.width = String(scaled_bar_width) + "%";
    temp_bar.style.height = "100%";
    temp_bar.style.borderRadius = "25px";
    // temp_bar.style.backgroundColor = getColor(period.temperature + 20);

    // temperature text
    let temp_text = document.createElement("div");
    temp_text.id = "temp-" + period.number;
    temp_text.classList.add("temp-text");
    temp_text.innerHTML = period.temperature + "&deg;";

    // appending children - leaving out bar for now
    temp_wrapper.appendChild(temp_text);
    temp_el.appendChild(temp_wrapper);  

    // icon
    icon_el = document.createElement("div");
    icon_el.classList.add("icon");
    icon_el.id = "icon-" + period.number;
    icon_el = build_icon(period, icon_el, meteocons_day, meteocons_night);

    // if(cha_prec_text > 0) {
    //     let icon_cha_prec = document.createElement("div");
    //     icon_cha_prec.classList.add("icon-cha-prec");

    //     let raindrop = document.createElement("img");
    //     raindrop.style.height = "100%";
    //     raindrop.src = "./meteocons/raindrop_small.png";

    //     let icon_cha_prec_text = document.createElement("div");
    //     icon_cha_prec_text.classList.add("icon-cha-prec-text");
    //     icon_cha_prec_text.textContent = cha_prec_text + "%";

    //     // icon_cha_prec.appendChild(raindrop);
    //     icon_cha_prec.appendChild(icon_cha_prec_text);
    //     icon_el.appendChild(icon_cha_prec);
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
    cond_el.appendChild(cond_text);

    // relative humidity
    rel_hum_el = document.createElement("div");
    rel_hum_el.classList.add("data");

    let rel_hum_wrapper = document.createElement("div");
    rel_hum_wrapper.style.width = "100%";
    rel_hum_wrapper.style.display = "flex";
    rel_hum_wrapper.style.justifyContent = "center";
    rel_hum_wrapper.style.gap = "10px";
    rel_hum_wrapper.style.alignItems = "center";
    
    let rel_hum_circle = document.createElement("div");
    rel_hum_circle.classList.add("circle");
    // rel_hum_circle.style.backgroundColor = getColorHumidity(Number(period.relativeHumidity.value));
    rel_hum_circle.style.width = "0.8em";
    rel_hum_circle.style.height = rel_hum_circle.style.width;

    let rel_hum_text_el = document.createElement("div");
    rel_hum_text_el.textContent = rel_hum_text + " %";

    rel_hum_wrapper.appendChild(rel_hum_circle);
    rel_hum_wrapper.appendChild(rel_hum_text_el);
    rel_hum_el.appendChild(rel_hum_wrapper);

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

    wind_el.appendChild(wind_dir)
    wind_el.appendChild(wind_speed)

    // chance of precipitation
    cha_prec_el = document.createElement("div");
    cha_prec_el.textContent = cha_prec_text + " %";
    cha_prec_el.classList.add("data");

    if (cha_prec_text == 0) {
        cha_prec_el.style.color = "#DEDEDE"
        }

    // add period name, icon, temp, cond to pane
    parent_el.appendChild(pname_el);
    parent_el.appendChild(icon_el);
    parent_el.appendChild(temp_el);
    parent_el.appendChild(cond_el);
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

async function get_mcons() {
    // load meteocons
    const m_resp =  await fetch("./json/icon_keys.json");
    const meteocons = await m_resp.json();
    return meteocons
}

function build_icon(period, icon_el, meteocons_day, meteocons_night) {

    icon_el.innerHTML = "";

    let single_icon = true;
    if (period.shortForecast.includes("then")){
        single_icon = false;
    }
    let icon_img;
    if(single_icon){
        icon_img = document.createElement("img");
        icon_img.classList.add("icon-img");
        icon_img.src = get_icon(period.shortForecast, period.isDaytime,
                                meteocons_day, meteocons_night);

    } else {
        // container for 2 icons. full height of row, let the width set automatically 
        // when 2 icons are added to it
        let icons_con = document.createElement("div");
        icons_con.style.height = "100%";

        // split shortForecast text on "then"
        let sFore_split = period.shortForecast.split(" then ");
        let cond_1 = sFore_split[0];
        let cond_2 = sFore_split[1];

        let icon_img_top = document.createElement("div");
        icon_img_top.style.height = "50%";
        icon_img_top.style.display = "flex";
        icon_img_top.style.justifyContent = "left";

        let icon_top_1 = document.createElement("img");
        icon_top_1.height = "50%";
        // icon_top_1.width = "50%";
        icon_top_1.src = get_icon(cond_1, period.isDaytime, meteocons_day, meteocons_night);
        icon_img_top.appendChild(icon_top_1);

        let icon_img_bottom = document.createElement("div");
        icon_img_bottom.style.height = "50%";
        icon_img_bottom.style.display = "flex";
        icon_img_bottom.style.justifyContent = "right";
        
        let icon_bot_2 = document.createElement("img");
        icon_bot_2.height = "50%";
        // icon_bot_2.width = "50%";
        icon_bot_2.src = get_icon(cond_2, period.isDaytime, meteocons_day, meteocons_night);
        icon_img_bottom.appendChild(icon_bot_2);

        icons_con.appendChild(icon_img_top);
        icons_con.appendChild(icon_img_bottom);

        icon_img = icons_con;
    }

    icon_el.appendChild(icon_img);

    return icon_el;
}

function get_icon(shortForecast, isDaytime, meteocons_day, meteocons_night){
    if(isDaytime){
        if (meteocons_day[shortForecast] != undefined) {
            return "./meteocons/" + meteocons_day[shortForecast];
        }
        else {
            return "./meteocons/code-red.png"
        }

    } else {
        if (meteocons_night[shortForecast] != undefined) {
            return "./meteocons/" + meteocons_night[shortForecast];
        }
        else {
            return "./meteocons/code-red.png"
        }
    }
}