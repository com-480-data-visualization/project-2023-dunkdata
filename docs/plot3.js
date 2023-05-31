class PlayerPerf{
    constructor(svg_id, div_id) {
        let circles;
        let combinedData;
        let yearSelect;
        let metricSelect;
        let yearsDict;
        let xScale;
        let yScale;
        let curTeam;
        let dropdownsActive = false;

        // dimensions
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        this.svg = d3.select('#' + svg_id)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

		//Get the svg dimensions
        
        let teamToID = {}; // dictionary converting team nickname to team_id
        const metricsDict = {
            "Box Offense": "raptor_box_offense",
            "Box Defense": "raptor_box_defense",
            "Box Total": "raptor_box_total",
            "On/Off Offense": "raptor_onoff_offense",
            "On/Off Defense": "raptor_onoff_defense",
            "On/Off Total": "raptor_onoff_total",
            "Offense": "raptor_offense",
            "Defense": "raptor_defense",
            "Total": "raptor_total",
            "WAR Total": "war_total",
            "WAR Regular": "war_reg_season",
            "WAR Playoffs": "war_playoffs",
            "Predator Offense": "predator_offense",
            "Predator Defense": "predator_defense",
            "Predator Total": "predator_total",
            "Pace Impact": "pace_impact"
          };



        function mouseOver(event, d){
            d3.select(this)
            .attr("fill", "red")
            .attr("r", 6); // Enlarge the circle slightly
        
          // Display the name
          svg.append("text")
            .attr("id", "nameLabel")
            .attr("cx", xScale(d.cx) + 10)
            .attr("cy", yScale(d.cy) - 10)
            .text(d.player_name)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "red");
        }

        function mouseOut(event, d){
            d3.select(this)
                .attr("fill", "steelblue")
                .attr("r", 4); // Restore the original circle size

            // Remove the name label
            svg.select("#nameLabel").remove();
        }

        function mouseClick(event, d){
        }

        function mouseInteractions(){
            circles.on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", mouseClick);
        }

        function fillPlot(playoffData){
            svg.selectAll("circle").remove();
            svg.selectAll(".x-axis").remove();
            svg.selectAll(".y-axis").remove();

            const playoffArray = Object.values(playoffData);

            const xExtent = d3.extent(playoffArray, d => d.stat);
            const yExtent = d3.extent(playoffArray, d => d.statDiff);
            const maxExtent = Math.max(Math.abs(xExtent[0]), Math.abs(xExtent[1]), Math.abs(yExtent[0]), Math.abs(yExtent[1]));

            xScale = d3.scaleLinear()
                .domain([-maxExtent, maxExtent])
                .range([margin.left, margin.left + width]);

            yScale = d3.scaleLinear()
                .domain([-maxExtent, maxExtent])
                .range([margin.top + height, margin.top]);
                
                const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("+"));
                const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("+"));

            circles = svg
                .selectAll("circle")
                .data(playoffArray)
                .enter()
                .append("circle")
                .attr("name", d => d.player_name)
                .attr("cx", d => xScale(d.stat))
                .attr("cy", d => yScale(d.statDiff))
                .attr("r", 4)
                .attr("fill", "steelblue");

            svg
                .append("g")
                .attr("transform", `translate(10, ${margin.top + height / 2 + 10})`)
                .attr("class", "x-axis")
                .call(xAxis);
            
            svg
                .append("g")
                .attr("transform", `translate(${margin.left + width / 2 + 10}, 10)`)
                .attr("class", "y-axis")
                .call(yAxis);
            
            mouseInteractions();
        }

        function createScatter(metric, year){
            const yearData = combinedData.filter((d) => d.season === year);
            const aggregatedData = yearData.reduce((acc, entry) => {
                // group by player_id and season_type (combine stats for players who have played for different teams)
                const key = `${entry.player_id}-${entry.season_type}`;
                if (!acc[key]) {
                  acc[key] = { player_name: entry.player_name, player_id: entry.player_id, season_type: entry.season_type, stat: 0, totalPossessions: 0 };
                }
                acc[key].stat += entry[metric] * entry.poss; // storing the weighted sum here
                acc[key].totalPossessions += entry.poss; // total possessions to be used to divide later on
                return acc;
            }, {});

            const playoffPlayers = new Set(yearData.filter(d => d.season_type == "PO").map(obj => obj.player_id));
            
            const postSeasonPlayers = Object.values(aggregatedData)
                .filter(d => playoffPlayers.has(d.player_id))
                .map(entry => ({
                    player_name: entry.player_name,
                    player_id: entry.player_id,
                    season_type: entry.season_type,
                    stat: entry.stat / entry.totalPossessions,
            }));

            const playoffData = postSeasonPlayers.reduce((acc, entry) => {
                const key = entry.player_id;
                if (!acc[key]) {
                    acc[key] = { player_name: entry.player_name, player_id: entry.player_id, stat: 0, statDiff: 0};
                  }
                if(entry.season_type == "PO"){
                    acc[key].stat += entry.stat; // storing the weighted sum here
                    acc[key].statDiff += entry.stat;
                }
                else
                    acc[key].statDiff -= entry.stat;

                  return acc;
            }, {});
            fillPlot(playoffData);

            console.log(playoffData);
        }

        function populateDropdown(selectElement, options) {
            selectElement.selectAll("option")
                .data(options)
                .join("option")
                .attr("value", (d) => d)
                .text((d) => d);
        }

        function createYearDD(){
            const yearSelect = d3.select("#perf-year-select")
                .attr("id", "perf-year-select")

            const years = [...new Set(combinedData.map(obj => obj.season))];

            const yearsDisplay = years.map(obj => {
                const season = parseInt(obj);
                const prev =  season - 1;
                return prev.toString() + "-" + season.toString().slice(2);
            });

            yearsDict = yearsDisplay.reduce((obj, key, index) => {
                obj[key] = years[index];
                return obj;
            }, {});

            yearsDisplay.sort((a, b) => a.localeCompare(b));
            const yearsHeader = ["--Year--", ...yearsDisplay];
            populateDropdown(yearSelect, yearsHeader);
            return yearSelect;
        }

        function createMetricDD(){
            const metricSelect = d3.select("#perf-metric-select")
                .attr("id", "perf-metric-select")
                const metricOptions = [
                    "Box Offense",
                    "Box Defense",
                    "Box Total",
                    "On/Off Offense",
                    "On/Off Defense",
                    "On/Off Total",
                    "Offense",
                    "Defense",
                    "Total",
                    "WAR Total",
                    "WAR Regular",
                    "WAR Playoffs",
                    "Offense",
                    "Defense",
                    "Total",
                    "Pace Impact"
                ];
            
            const metricOptionsHeader = ["--Metric--", ...metricOptions];
            populateDropdown(metricSelect, metricOptionsHeader);
            return metricSelect;
        }

        function handleSelect(yearHandler, metricHandler){
            const selectedYear = yearHandler.property('value');
            const selectedMetric = metricHandler.property('value');
            if(selectedYear != "--Year--" && selectedMetric != "--Metric--"){
                dropdownsActive = true;
                // Now that both the options are selected, we can present our visualisation
                createScatter(metricsDict[selectedMetric], yearsDict[selectedYear]);
            }
            else{
                dropdownsActive = false;
                // Reset, that is, Remove the visualisation (optional)
            }
        }
        let svg = this.svg;

        Promise.all([
            d3.csv("modern_RAPTOR_by_team.csv"),
            d3.csv("latest_RAPTOR_by_team.csv")
        ]).then(function(values) {
            const modernData = values[0];
            const latestData = values[1];
            combinedData = modernData.concat(latestData);

            yearSelect = createYearDD();
            metricSelect = createMetricDD();

            yearSelect.on('change', function(){
                handleSelect(yearSelect, metricSelect);
            });
            metricSelect.on('change', function(){
                handleSelect(yearSelect, metricSelect);
            });

        });
           
    }

    createProjection() {
        //Define map projection
        let projection = d3.geoAlbersUsa()
            .translate([this.svg_width/2, this.svg_height/2])
            .scale([1000]);
        return projection;
    }
}

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

function initPlayerPerf(){
    perf_object = new PlayerPerf("scatterPlot", "perfcontainer");
}