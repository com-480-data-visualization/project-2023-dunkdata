class PlayerPerf{
    constructor(svg_id, div_id) {
        let circles;
        let combinedData;
        let playerData;
        let playoffData;
        let yearSelect;
        let metricSelect;
        let catSelect;
        let yearsDict;
        let xScale;
        let yScale;
        let colorScale;
        let playerName;
        let curTeam;
        let dropdownsActive = false;

        // dimensions
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
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

            const prevR = d3.select(this).attr("r");
            const prevColour = d3.select(this).style("fill");
            
            d3.select(this)
            .transition()
            .duration(200)
            .attr("original-size", prevR)
            .attr("r", 6) // Enlarge the circle slightly
            .attr("original-colour", prevColour)
            .style("fill", "orange"); 
            
        
        // Display the name
        var playerContainer = d3.select("#player-container");

        // Append a new div for the player name
        
        playerName = playerContainer
        .selectAll('span')
        .data([d.player_name])
        .enter()
        .append('span')
        .text(d => d);

        }

        function mouseOut(event, d){
            const originalSize = d3.select(this).attr("original-size");
            const originalColour = d3.select(this).attr("original-colour");
            d3.select(this)
            .transition()
            .duration(200)
            .style("fill", originalColour)
            .attr("r", originalSize); // Restore the original circle size

            // Remove the name label
            playerName.remove();
        }

        function mouseClick(event, d){
        }

        function mouseInteractions(){
            circles.on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", mouseClick);
        }

        function clearScatter(){
            svg.selectAll("circle").remove();
            svg.selectAll(".x-axis").remove();
            svg.selectAll(".y-axis").remove();
        }

        function clearLegend(){
            var legendContainer = d3.select("#legend-container");
            legendContainer.selectAll('*').remove();
        }

        function generateRandomColor() {
            var r = Math.floor(Math.random() * 256);
            var g = Math.floor(Math.random() * 256);
            var b = Math.floor(Math.random() * 256);
            
            return "rgb(" + r + ", " + g + ", " + b + ")";
          }

        function generateColorScale(domainValues) {
            let genColorScale;
            var colors = [];
  
            // Generate n distinct colors
            for (var i = 0; i < domainValues.length; i++) {
                var color = generateRandomColor();
                
                // Check if the color is already in the array
                while (colors.includes(color)) {
                color = generateRandomColor();
                }
                
                colors.push(color);
            }
            
            genColorScale = d3.scaleOrdinal()
            .domain(domainValues)
            .range(colors);
            
            return genColorScale;
        }

        function createLegend(legendArray){
            var legendContainer = d3.select("#legend-container");
            legendContainer.selectAll('*').remove();
      
            // Create legend items
            var legendItems = legendContainer.selectAll(".legend-item")
                .data(legendArray)
                .enter()
                .append("div")
                .attr("class", "legend-item");
        
            // Add color squares to legend items
            legendItems.append("div")
                .attr("class", "legend-color")
                .style("background-color", function(d) { 
                    return colorScale(d); 
                });
        
            // Add text labels to legend items
            legendItems.append("div")
                .style("font-size", "14px")
                .text(function(d) { return d; });


            d3.selectAll('.legend-item')
                .on('click', function() {
                    var clickedElem = d3.select(this).select('.legend-color');
                    var clickedColor = clickedElem.style('background-color');
                    // Filter the circles based on the clicked color
                    circles.style('display', function() {
                        var circleColor = d3.select(this).attr('fill');
                        return circleColor === clickedColor ? 'block' : 'none';
                    });
                });
        }

        function calculateAge(birthdate, currentDate) {

            var birthDateObj = new Date(birthdate);
            var currentDateObj = new Date(currentDate);
          
            // difference in years between the dates
            var age = currentDateObj.getFullYear() - birthDateObj.getFullYear();
          
            // if the current date is before the birthdate in the same year
            if (
              currentDateObj.getMonth() < birthDateObj.getMonth() ||
              (currentDateObj.getMonth() === birthDateObj.getMonth() &&
                currentDateObj.getDate() < birthDateObj.getDate())
            ) {
              age--;
            }
          
            return age;
          }

        function handleAge(changeScale){
            var ages = new Set();
            const selectedYear = yearSelect.property('value');
            const curDate = "20" + selectedYear.slice(-2) + "-04-15 00:00:00"; // start of the play-offs
            Object.values(playoffData).forEach(element => {
                if(element.matchedItem.birthdate)
                    ages.add(calculateAge(element.matchedItem.birthdate, curDate));
            });
            let sortedAges = Array.from(ages);
            sortedAges.sort();
            if(changeScale)
                colorScale = generateColorScale(sortedAges);
            circles.attr("fill", function(d) { 
                return colorScale(calculateAge(d.matchedItem.birthdate, curDate)); 
            });
            createLegend(sortedAges);
        }

        function handleTeam(changeScale){
            var teams = new Set();
            Object.values(playoffData).forEach(element => {
                if(element.team)
                    teams.add(element.team);
            });
            let sortedTeams = Array.from(teams);
            sortedTeams.sort();
            if(changeScale)
                colorScale = generateColorScale(sortedTeams);
            circles.attr("fill", function(d) { 
                return colorScale(d.team); 
            });
            createLegend(sortedTeams);
        }

        function handleHeight(changeScale){
            var heights = new Set();
            Object.values(playoffData).forEach(element => {
                if(element.matchedItem.height)
                    heights.add(element.matchedItem.height);
            });
            let sortedHeights = Array.from(heights);
            sortedHeights.sort(function(a, b) {
                var heightA = a.split("-").map(Number);
                var heightB = b.split("-").map(Number);
                
                if (heightA[0] === heightB[0]) // if they are the same number of feet, compare inches
                  return heightA[1] - heightB[1];
                else
                  return heightA[0] - heightB[0];
            });
            if(changeScale){
                colorScale = generateColorScale(sortedHeights);
            }
            circles.attr("fill", function(d) { 
                return colorScale(d.matchedItem.height); 
            });

            createLegend(sortedHeights);
        }

        function handlePosition(changeScale){
            var positions = new Set();
            playerData.forEach(element => {
                if(element.position)
                    positions.add(element.position);
            });
            if(changeScale)
                colorScale = generateColorScale(Array.from(positions));
            circles.attr("fill", function(d) { 
                return colorScale(d.matchedItem.position); 
            });

            createLegend(positions, colorScale);
    }

        

        function createCategoryDD(){
            catSelect = d3.select("#category")
                .attr("id", "category");
            catSelect.style("display", "block");
            const categories = ["--Category--", "Position", "Height", "Team", "Age"];
            // const categories = ["--Category--", "Position", "Height", "Team", "Age", "Country"];
            populateDropdown(catSelect, categories);
            catSelect.on('change', function(){
                handleSelect(false, true);
            })
        }

        function fillPlot(){

            const playoffArray = Object.values(playoffData);

            createCategoryDD();

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
                  acc[key] = { player_name: entry.player_name, player_id: entry.player_id, team: entry.team, season_type: entry.season_type, stat: 0, totalPossessions: 0 };
                }
                acc[key].stat += entry[metric] * entry.poss; // storing the weighted sum here
                acc[key].totalPossessions += entry.poss; // total possessions to be used to divide later on
                return acc;
            }, {});

            const playoffPlayers = new Set(yearData.filter(d => d.season_type === "PO").map(obj => obj.player_id));
            
            const postSeasonPlayers = Object.values(aggregatedData)
                .filter(d => playoffPlayers.has(d.player_id))
                .map(entry => ({
                    player_name: entry.player_name,
                    player_id: entry.player_id,
                    team: entry.team,
                    season_type: entry.season_type,
                    stat: entry.stat / entry.totalPossessions
            }));

            playoffData = postSeasonPlayers.reduce((acc, entry) => {
                const key = entry.player_id;
                if (!acc[key]) {
                    acc[key] = { player_name: entry.player_name, player_id: entry.player_id, team: entry.team, stat: 0, statDiff: 0};
                  }
                if(entry.season_type == "PO"){
                    acc[key].stat += entry.stat; // storing the weighted sum here
                    acc[key].statDiff += entry.stat;
                    acc[key].team = entry.team; // just to ensure the final team selected for a player is the PO team
                }
                else
                    acc[key].statDiff -= entry.stat;

                  return acc;
            }, {});
            for (var key in playoffData){
                var playerStats = playoffData[key];
                var matchingItem = playerData.find(function(item) {
                    return item.display_first_last === playerStats.player_name;
                });
                playerStats.matchedItem = matchingItem;
            }
            fillPlot();
        }

        function populateDropdown(selectElement, options) {
            selectElement.selectAll("option")
                .data(options)
                .join("option")
                .attr("value", (d) => d)
                .text((d) => d);
        }

        function createYearDD(){
            yearSelect = d3.select("#perf-year-select")
                .attr("id", "perf-year-select");

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
            metricSelect = d3.select("#perf-metric-select")
                .attr("id", "perf-metric-select");
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

        function handleSelect(metChange, catChange){
            const selectedYear = yearSelect.property('value');
            const selectedMetric = metricSelect.property('value');
            
            if(catSelect == null){
                if(selectedYear != "--Year--" && selectedMetric != "--Metric--"){
                    dropdownsActive = true;
                    // Now that both the options are selected, we can present our visualisation
                    clearScatter();
                    createScatter(metricsDict[selectedMetric], yearsDict[selectedYear]);
                }
                else{
                    dropdownsActive = false;
                    clearScatter();
                    // Reset, that is, Remove the visualisation (optional)
                }
            }
            else{
                const category = catSelect.property('value');
                dropdownsActive = false;
                if(selectedYear != "--Year--" && selectedMetric != "--Metric--" && category != "--Category--"){
                    dropdownsActive = true;
                    clearScatter();
                    createScatter(metricsDict[selectedMetric], yearsDict[selectedYear]);
                    if(category == "Position")
                        handlePosition(catChange); // Only change the legend if the category is changed
                    if(category == "Height")
                        handleHeight(!metChange); // No need to change the legend when the metric changes
                    if(category == "Team")
                        handleTeam(!metChange); // Have to change if year is changed, since different teams make it to the playoffs
                    if(category == "Age")
                        handleAge(!metChange); // Have to change if year is changed, since different teams make it to the playoffs

                }
                else{
                    dropdownsActive = false;
                    // Reset, that is, Remove the visualisation (optional)
                    clearScatter();
                    clearLegend();
                    createScatter(metricsDict[selectedMetric], yearsDict[selectedYear]);
                }
            }
            
        }
        let svg = this.svg;

        Promise.all([
            d3.csv("modern_RAPTOR_by_team.csv"),
            d3.csv("latest_RAPTOR_by_team.csv"),
            d3.csv("common_player_info.csv")
        ]).then(function(values) {
            const modernData = values[0];
            const latestData = values[1];
            playerData = values[2];
            combinedData = modernData.concat(latestData);

            yearSelect = createYearDD();
            metricSelect = createMetricDD();

            yearSelect.on('change', function(){
                handleSelect(false, false);
            });
            metricSelect.on('change', function(){
                handleSelect(true, false);
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