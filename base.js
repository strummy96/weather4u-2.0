
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
}