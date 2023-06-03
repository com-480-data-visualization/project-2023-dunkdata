class Head2Head{
    constructor(svg_id, div_id) {
        let circles;
        let teamData;
        let gameData;
        let playoffData;
        let teamSelect;
        let metricSelect;
        let selectedTeam = null;
        let curTeam;
        let dropdownsActive = false;
        this.svg = d3.select('#' + svg_id);
		//Get the svg dimensions
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

        let logoCarouselContainer = document.getElementById('logoCarousel');
        $(logoCarouselContainer).slick({
            slidesToShow: 6, // Number of logos to show at once
            slidesToScroll: 1, // Number of logos to scroll at a time
            infinite: true, // Enable infinite scrolling
            arrows: true, // Show navigation arrows
        });
        let logoContainer;
        let slider;
        let prevButton;
        let nextButton;
        let curSlide = 0;

        let teamToID = {}; // dictionary converting team nickname to team_id

        let metricsDict = {
            "Points": "pts",
            "FT%": "ft_pct",
            "FGM": "fgm",
            "FTM": "ftm",
            "FG3M": "fg3m",
            "FG3A": "fg3a",
            "FTA": "fta",
            "FGA": "fga",
            "FG%": "fg_pct",
            "FG3%": "fg3_pct",
            "Rebounds": "reb",
            "OREB": "oreb",
            "DREB": "dreb",
            "Assists": "ast",
            "Steals": "stl",
            "Blocks": "blk",
            "Turnovers": "tov",
            "Fouls": "pf",
          };


        function getGeoGenerator(projection) {
            return d3.geoPath().projection(projection);
        }

        function summary(games, homeTeam, awayTeam, away){
            let totalGames = 0;
            const sumStatsHome = {};
            const sumStatsAway = {};
            const countStatsHome = {}; // since some of the values are null, we want to divide by the total number of non-null entries
            const countStatsAway = {}; // since some of the values are null, we want to divide by the total number of non-null entries
            const attributes = Object.values(metricsDict);
            const attributesHome = Object.values(metricsDict).map(d => d + "_home");
            const attributesAway = Object.values(metricsDict).map(d => d + "_away");
            games.forEach(game => {
                attributesHome.forEach(attribute => {
                    if(!sumStatsHome[attribute]){
                        sumStatsHome[attribute] = 0;
                        countStatsHome[attribute] = 0;
                    }
                    if(game[attribute] !== null){
                        sumStatsHome[attribute] += parseFloat(game[attribute]);
                        countStatsHome[attribute]++;
                    }
                })
                attributesAway.forEach(attribute => {
                    if(!sumStatsAway[attribute]){
                        sumStatsAway[attribute] = 0;
                        countStatsAway[attribute] = 0;
                    }
                    if(game[attribute] !== null){
                        sumStatsAway[attribute] += parseFloat(game[attribute]);
                        countStatsAway[attribute]++;
                    }
                })

            });

            // Calculate average stats
            const averageStats = {};

            attributes.forEach(attribute => {
                averageStats[attribute] = [(sumStatsHome[attribute+"_home"] / countStatsHome[attribute+"_home"]).toFixed(2), (sumStatsAway[attribute+"_away"] / countStatsAway[attribute+"_away"]).toFixed(2)];
            });

            if(away)
                createTable(averageStats, "statsTableAway", homeTeam, awayTeam);
            else
                createTable(averageStats, "statsTableHome", homeTeam, awayTeam);
        }

        function fillSelectedTeam(logoElement, team){

            // We fill it inside this container
            const selectedTeamContainer = document.getElementById('selectedTeamContainer');
            selectedTeamContainer.innerHTML = '';
            const selectedTeamLogo = document.createElement('img');
            selectedTeamLogo.src = logoElement.src;
            selectedTeamLogo.alt = team.nickname;
            // Create a copy for the team logo element to be put in the container
            selectedTeamContainer.appendChild(selectedTeamLogo);
            selectedTeam = team.nickname;
            handleSelect();
        }



        // Function to move to the previous slide
        function goToPrevSlide() {
        if (curSlide > 0) {
            curSlide--;
            updateSlidePosition();
        }
        }

        // Function to move to the next slide
        function goToNextSlide() {
        var totalSlides = slider.children.length;
        if (curSlide < totalSlides - 1) {
            curSlide++;
            updateSlidePosition();
        }
        }

        // Function to update the slide position based on the current index
        function updateSlidePosition() {
        var slideWidth = slider.children[0].offsetWidth;
        var newPosition = -curSlide * slideWidth;
        slider.style.transform = 'translateX(' + newPosition + 'px)';
        }


        function generateLogoCarousel() {
            logoContainer = document.getElementById('logoCarousel');
            var carouselSlider = document.createElement('div');
            carouselSlider.classList.add('carousel-slider');
            // Loop through the teams array and create logo elements
            teamData.forEach(function (team) {
                var logoContainerDiv = document.createElement('div');
                logoContainerDiv.classList.add('carousel-slide'); // Set the class of the div container
                var logoElement = document.createElement('img');
                logoElement.src = "logos/" + team.abbreviation + "_2023.png";
                logoElement.alt = team.nickname;
              // Add click event listener to the logo element
                logoElement.addEventListener('click', function () {
                    fillSelectedTeam(logoElement, team, logoContainer);
                });

                logoContainerDiv.appendChild(logoElement);

                // Append the logo element to the carousel slide
                carouselSlider.appendChild(logoContainerDiv);
            });

            // Create carousel navigation buttons
            prevButton = document.createElement('button');
            prevButton.classList.add('carousel-prev-button');

            nextButton = document.createElement('button');
            nextButton.classList.add('carousel-next-button');

            prevButton.addEventListener('click', goToPrevSlide);
            nextButton.addEventListener('click', goToNextSlide);

            // Append carousel slide and buttons to the logo container
            logoContainer.innerHTML = '';
            logoContainer.appendChild(prevButton);
            logoContainer.appendChild(carouselSlider);
            logoContainer.appendChild(nextButton);
          }



        function generateLogoGrid() {
            var logoGrid = document.getElementById('logoGrid');

            // Clear the existing content in the logo grid
            logoGrid.innerHTML = '';

            // Loop through the teams array and create logo elements
            teamData.forEach(function (team) {
                var logoElement = document.createElement('img');
                logoElement.src = "logos/" + team.abbreviation + "_2023.png";
                logoElement.alt = team.nickname;

                // Add click event listener to the logo element
                logoElement.addEventListener('click', function () {
                    fillSelectedTeam(logoElement, team, logoGrid);
                });

            // Append the logo element to the logo grid container
            logoGrid.appendChild(logoElement);
            });
          }

        function createTable(displayDict, tableName, homeTeam, awayTeam){
            var table = document.getElementById(tableName);
            table.style.display = "table";
            var tbody = table.getElementsByTagName("tbody")[0];

            // Clear existing data in the table
            tbody.innerHTML = "";

            var oldCaption = table.caption;
            if(oldCaption === null){
                // Create table caption
                var caption = document.createElement("caption");
                caption.textContent = awayTeam + " @ " + homeTeam;
                table.appendChild(caption);
            }
            else{
                // Create table caption
                var newCaption = document.createElement("caption");
                newCaption.textContent = awayTeam + " @ " + homeTeam;
                table.replaceChild(newCaption, oldCaption);
            }

            // Define the column names and data for the table
            var columns = ["Stats", homeTeam, awayTeam];
            var data = [
              ["Row 1, Cell 1", "Row 1, Cell 2"],
              ["Row 2, Cell 1", "Row 2, Cell 2"]
            ];

            var keys = Object.keys(displayDict);

            var data = [];
            for(var i = 0; i < keys.length; i++){
                var rowData = [];
                for(var j = 0; j < columns.length; j++){
                    if(j == 0)
                        rowData.push(keys[i]);
                    else
                        rowData.push(displayDict[keys[i]][j-1]);
                }
                data.push(rowData);
            }

            // Create table header row
            var thead = table.getElementsByTagName("thead")[0];
            var headerRow = document.createElement("tr");


            for (var i = 0; i < columns.length; i++) {
                var th = document.createElement("th");
                th.textContent = columns[i];
                th.style.fontSize = "20px"; // make the column names bigger
                headerRow.appendChild(th); // adds a node to the end of the list of children of the specified parent node
            }

            thead.innerHTML = "";
            thead.appendChild(headerRow);

            for (var i = 0; i < data.length; i++) {
                var row = document.createElement("tr");

                for (var j = 0; j < data[i].length; j++) {
                  var cell = document.createElement("td");
                  cell.textContent = data[i][j];
                  row.appendChild(cell);
                }

                tbody.appendChild(row);
              }


        }

        function mouseOver(event, d){

            // Get previous values to restore for mouseOut
            const prevR = d3.select(this).attr("r");
            const prevColour = d3.select(this).style("fill");

            d3.select(this)
                .transition()
                .duration(200)
                .attr("original-size", prevR)
                .attr("r", 10)
                .attr("original-colour", prevColour)
                .style("fill", "orange");
            let projected = projection([d.longitude, d.latitude]);
            svg.append("text")
                .attr("id", "tooltip")
                .attr("x", projected[0] + 10)
                .attr("y", projected[1] + 10)
                .text(d.nickname + "(" + d.city + ")")
                .attr("font-size", 15);

            svg.append("image")
                .attr("xlink:href", "logos/" + d.abbreviation + "_2023.png") // Set the path to your logo image file
                .attr("x", projected[0] + d.nickname.length*5) // Set the x-coordinate of the image position based on the length of the nickname
                .attr("y", projected[1] - 60) // Set the y-coordinate of the image position
                .attr("width", 50) // Set the width of the image
                .attr("height", 50); // Set the height of the image


            if(dropdownsActive){
                const streak = d3.select(this).attr("streak");
                var characterWidths = streak.split('').map(function(d) {
                    return d === 'W' ? 16 : 10; // since 'W' is wider than 'L'
                });
                svg.append("text")
                    .attr("id", "tooltip")
                    .attr("x", projected[0] + 20)
                    .attr("y", projected[1] + 30)
                    .selectAll("tspan")
                .data(streak.split(''))
                .enter()
                .append("tspan")
                .attr("x", function(_, i) {
                    var accumulatedWidth = characterWidths.slice(0, i).reduce(function(sum, width) {
                      return sum + width;
                    }, 0);
                    return projected[0] + 20 + accumulatedWidth;
                  })
                .text(function(d) { return d; })
                .style("fill", function(d) { return d === "L" ? "red" : "green"; });
            }
        }

        function mouseOut(event, d){
            const originalSize = d3.select(this).attr("original-size");
            const originalColour = d3.select(this).attr("original-colour");
            d3.select(this)
            .transition()
            .duration(200)
            .attr("r", originalSize)
            .style("fill", originalColour);
            svg.select("#tooltip").remove();
            d3.selectAll('text#tooltip').remove();
            d3.selectAll('image').remove();
        }

        function mouseClick(event, d){
            if(!dropdownsActive)
                return;
            // Only triggers when both dropdowns are active
            const awayGames = gameData.filter((x) => x.team_id_away === curTeam && x.team_id_home === d.id);
            const reverseFixture = gameData.filter((x) => x.team_id_away === d.id && x.team_id_home === curTeam);
            var homeTeam;
            var awayTeam;
            teamData.forEach(element => {
                if (d.id === element.id)
                  homeTeam = element.nickname;
                if (curTeam === element.id)
                    awayTeam = element.nickname;
              });
            teamData.forEach(element => teamToID[element.nickname] = element.id);
            summary(awayGames, homeTeam, awayTeam, true);
            summary(reverseFixture, awayTeam, homeTeam, false);
        }

        function mouseInteractions(){
            circles.on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", mouseClick);
        }

        function createCircles(svg, data, projection) {
            circles = svg.selectAll("circle")
                .data(data)
                .join("circle")
                .attr("id", d => d.id)
                .attr("cx", function(d) {
                    return projection([d.longitude, d.latitude])[0];
                })
                .attr("cy", function(d) {
                    return projection([d.longitude, d.latitude])[1];
                })
                .attr("r", 5)
                .style("fill", "red")
                .style("stroke", "gray")
                .style("stroke-width", 0.25)
                .style("opacity", 0.75);

            // circles.append("title")
            //     .text(function(d) {
            //         return d.nickname + " (" + d.city+ ")";
            //     });

            mouseInteractions();
        }

        function createGeojson(usjson, cajson) {
            //Load in GeoJSON data
            let usFeatures = topojson.feature(usjson, usjson.objects.default).features;
            let caFeatures = topojson.feature(cajson, cajson.objects.default).features;
            let geojson = {type: "FeatureCollection", features: usFeatures.concat(caFeatures)};
            return geojson;
        }

        function findMinMax(aggMetric) {
            let l = -Infinity;
            let s = Infinity;

            for (const id in aggMetric) {
              const perfAway = aggMetric[id].perf_away;
              if(perfAway > l){
                l = perfAway;
              }
              if(perfAway < s){
                s = perfAway;
              }
            }
            return {largest: l, smallest: s};
          }

        function createLegend(){
            const colorRange = ["red", "blue"];

            // Create a linear gradient
            const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "color-gradient")
            .attr("gradientTransform", "rotate(90)");

            // Add color stops to the gradient
            gradient.selectAll("stop")
            .data(colorRange)
            .enter().append("stop")
            .attr("offset", (d, i) => i / (colorRange.length - 1))
            .attr("stop-color", d => d);

            // Define the legend position and dimensions
            const height = 50;
            const legendX = 10;
            const legendY = height - 30;
            const legendWidth = 20;
            const legendHeight = 200;

            // Append the legend rectangle
            svg.append("rect")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#color-gradient)");

            // Append the legend text
            svg.append("text")
            .attr("x", legendX-5)
            .attr("y", legendY + legendHeight + 15)
            .attr("text-anchor", "start")
            .text("Low");

            svg.append("text")
            .attr("x", legendX + 2*legendWidth-8)
            .attr("y", legendY - 5)
            .attr("text-anchor", "end")
            .text("High");
        }

        function createGradient(team_id, metric_prefix){
            /* Get only games in which the selected team was the away team
            * Group the teams played against and aggregate the relevant stat
            */
            curTeam = team_id; // For the mouseclick event
            const awayGames = gameData.filter((d) => d.team_id_away === team_id);
            const groupedGames = d3.group(awayGames, d => d.team_id_home);
            const aggMetric = {};
            const record = {};
            groupedGames.forEach((stats_at_venue, home_team_id) => {
                const perf_home = d3.mean(stats_at_venue, d => Number(d[metric_prefix + "_home"])); // how well the home team did
                const perf_away = d3.mean(stats_at_venue, d => Number(d[metric_prefix + "_away"])); // how well the away team (selected team) did against this home team
                const matches_played = stats_at_venue.length;
                aggMetric[home_team_id] = {perf_home, perf_away, matches_played};
                var lastFive = stats_at_venue.slice(-5).reverse(); // every team has played every other at-least five times
                // No! Jazz at Thunder?! What's going on there?
                var streak = "";
                lastFive.forEach(function(element){
                    streak += element.wl_away;
                });
                record[home_team_id] = streak;
            });
            const scores = Object.values(aggMetric).map(d => d.perf_away);
            const scoreExtent = d3.extent(scores); // gets the range of scores

            // Scale for the radius
            const radiusScale = d3.scaleLinear()
            .domain(scoreExtent)
            .range([0, 10]);

            // Scale for the colour
            const colorScale = d3.scaleLinear()
            .domain(scoreExtent)
            .range(['blue', 'red']);

            createLegend();

            circles.attr('r', circle => {
                const id = circle.id;
                if (aggMetric.hasOwnProperty(id)) {
                    const metricVal = aggMetric[id].perf_away;
                    const radius = radiusScale(metricVal);
                    return radius;
                }
            });

            circles.attr('streak', circle => {
                const id = circle.id;
                if(record.hasOwnProperty(id))
                    return record[id];
            });

            circles.style('fill', d => {
                const id = d.id;
                if (aggMetric.hasOwnProperty(id)) {
                  const score = aggMetric[id].perf_away;
                  return colorScale(score);
                }
                return 'gray'; // Default color if ID is not found in the dictionary
              });
        }

        function populateDropdown(selectElement, options) {
            selectElement.selectAll("option")
                .data(options)
                .join("option")
                .attr("value", (d) => d)
                .text((d) => d);
        }

        function createTeamDD(svg, projection){
            const teamSelect = d3.select("#h2h-team-select")
              .attr("id", "h2h-team-select")

            const teamNames = Array.from(new Set(teamData.map((d) => d.nickname)));
            teamNames.sort((a, b) => a.localeCompare(b));
            const teamNamesHeader = ["--Team--", ...teamNames];
            populateDropdown(teamSelect, teamNamesHeader);
            return teamSelect;
        }

        function createMetricDD(svg, projection){
            const metricSelect = d3.select("#h2h-metric-select")
              .attr("id", "h2h-metric-select")

            const metricOptions = Object.keys(metricsDict);
            const metricOptionsHeader = ["--Metric--", ...metricOptions];
            populateDropdown(metricSelect, metricOptionsHeader);
            return metricSelect;
        }

        function handleSelect(){
            // const selectedTeam = teamSelect.property('value');
            const selectedMetric = metricSelect.property('value');
            if(selectedTeam != null && selectedMetric != "--Metric--"){
                dropdownsActive = true;
                // Now that both the options are selected, we can present our visualisation
                createGradient(teamToID[selectedTeam], metricsDict[selectedMetric]);
            }
            else{
                dropdownsActive = false;
                // Reset, that is, Remove the visualisation (optional)
            }
        }

        let projection = this.createProjection();

        let svg = this.svg;

        Promise.all([
            d3.json("https://code.highcharts.com/mapdata/countries/us/us-all.topo.json"),
            d3.json("https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json")
        ]).then(function(values) {
            let usjson = values[0];
            let cajson = values[1];
            let geojson = createGeojson(usjson, cajson);


            // Selects all elements inside the current svg element having a path element
            // For example, the map is split into multiple rectangles each having a path
            // The next few lines are about adding attributes to the svg
            svg.selectAll("path")
                .data(geojson.features)
                .join("path")
                .attr("d", getGeoGenerator(projection))
                .style("fill-opacity", 0)
                .style("stroke", "#333")
                .style("stroke-width", function(d) {
                    if (d.properties.country === "United States of America") {
                        return 1.25;
                    } else {
                        return 0.5;
                    }
                });
            Promise.all([
                // CSV of all the files we need for the plot: team.csv and game.csv
                /*
                * Drop down consists of
                * 1) Team names
                * 2) Different metrics
                * 3) Time Period [Optional]
                */
                d3.csv("team.csv"),
                d3.csv("game.csv"),
                d3.csv("games.csv")
            ]).then(function(values) {
                teamData = values[0];
                gameData = values[1];
                playoffData = values[2];
                playoffData = playoffData.filter(d => d.GAME_ID.charAt(0) === "4"); // games whose ids start with 4 are

                // Fill up teamToID dictionary
                teamData.forEach(element => teamToID[element.nickname] = element.id);

                createCircles(svg, teamData, projection);
                teamSelect = createTeamDD(svg, projection);
                metricSelect = createMetricDD(svg, projection);
                generateLogoCarousel();

                // teamSelect.on('change', function(){
                //     handleSelect();
                // });
                metricSelect.on('change', function(){
                    handleSelect();
                });
                slider = logoContainer.querySelector('.carousel-slider');
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

function initHead2Head(){
    h2h_object = new Head2Head("map_h2h", "h2hcontainer");
}
