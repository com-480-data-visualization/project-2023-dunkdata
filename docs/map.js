class NBAMap {
  constructor(svg_id, div_id) {
    this.svg = d3.select("#" + svg_id);
    //Get the svg dimensions
    const svg_viewbox = this.svg.node().viewBox.animVal;
    this.svg_width = svg_viewbox.width;
    this.svg_height = svg_viewbox.height;

    function getGeoGenerator(projection) {
      return d3.geoPath().projection(projection);
    }

    function createGeojson(usjson, cajson) {
      //Load in GeoJSON data
      let usFeatures = topojson.feature(
        usjson,
        usjson.objects.default
      ).features;
      let caFeatures = topojson.feature(
        cajson,
        cajson.objects.default
      ).features;
      let geojson = {
        type: "FeatureCollection",
        features: usFeatures.concat(caFeatures),
      };
      return geojson;
    }

    function createCircles(svg, data, projection) {
      // Create circles and tooltip labels
      let circles = svg
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", function (d) {
          return projection([d.longitude, d.latitude])[0];
        })
        .attr("cy", function (d) {
          return projection([d.longitude, d.latitude])[1];
        })
        .attr("r", 5)
        .style("fill", "red")
        .style("stroke", "gray")
        .style("stroke-width", 0.25)
        .style("opacity", 0.75);

      circles.append("title").text(function (d) {
        return d.nickname + " (" + d.city + ")";
      });

      circles
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 10)
            .style("fill", "orange");
          let projected = projection([d.longitude, d.latitude]);
          svg
            .append("text")
            .attr("id", "tooltip")
            .attr("x", projected[0] + 10)
            .attr("y", projected[1] + 10)
            .text(d.nickname);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 5)
            .style("fill", "red");
          svg.select("#tooltip").remove();
        });
    }

    function createDropdown(svg, teamData, journeyData, projection) {
      const seasonSelect = d3
        .select("#map-season-select")
        .attr("id", "season-select")
        .on("change", handleSeasonSelect);
      const seasons = ["--Season--", ...generateSeasons(1977, 2023)];
      populateDropdown(seasonSelect, seasons);

      const teamSelect = d3
        .select("#map-team-select")
        .attr("id", "team-select")
        .on("change", handleTeamSelect);
      const teamNames = ["--Team--"];
      populateDropdown(teamSelect, teamNames);

      const playerSelect = d3
        .select("#map-player-select")
        .attr("id", "player-select")
        .on("change", handlePlayerSelect);
      const playerNames = ["--Player--"];
      populateDropdown(playerSelect, playerNames);

      // setDefaultValue(seasonSelect, seasons[0]);

      function handleTeamSelect() {
        d3.selectAll(".journey-path").remove();
        const selectedSeason = seasonSelect.property("value");
        const selectedSeasonNum = getSelectedSeasonNum(selectedSeason);
        if (selectedSeasonNum === -1) {
          // we don't do anything here
          return null;
        }
        const selectedSeasonData = filterJourneyDataBySeason(
          journeyData,
          selectedSeasonNum
        );
        const selectedTeam = d3.select(this).property("value");
        if (selectedTeam === "--Team--") {
          d3.select("#selected-team").remove();
          d3.select("#selected-team-label").remove();
          d3.select("#selected-player").remove();
          d3.select("#selected-player-label").remove();
          return null;
        }
        const selectedTeamData = filterTeamDataByNickname(
          teamData,
          selectedTeam
        );
        const selectedTeamCoords = [
          selectedTeamData[0].longitude,
          selectedTeamData[0].latitude,
        ];
        const projected = projection(selectedTeamCoords);

        if (!projected) return null;

        d3.select("#selected-team").remove();
        d3.select("#selected-team-label").remove();

        svg
          .append("circle")
          .attr("id", "selected-team")
          .attr("cx", projected[0])
          .attr("cy", projected[1])
          .attr("r", 10)
          .style("fill", "orange");

        svg
          .append("text")
          .attr("id", "selected-team-label")
          .attr("x", projected[0] + 10)
          .attr("y", projected[1] + 10)
          .text(selectedTeam);

        const selectedSeasonAndTeamData = filterJourneyDataByTeam(
          selectedSeasonData,
          selectedTeam
        );
        const playerNamesInSeasonAndTeam = getUniquePlayerNames(
          selectedSeasonAndTeamData
        );
        const sortedPlayerNames = [
          "--Player--",
          ...sortPlayerNames(playerNamesInSeasonAndTeam),
        ];

        populateDropdown(playerSelect, sortedPlayerNames);

        // this is a list of journeys of each player in the selected team
        const journeys = getPlayerJourneyData(sortedPlayerNames, journeyData);
        const journeyCoords = getJourneyCoords(journeys, teamData);
        // for each journey, draw a path
        drawJourneyPaths(svg, journeyCoords, projection, sortedPlayerNames);
      }

      function handleSeasonSelect() {
        const selectedSeason = d3.select(this).property("value");
        const selectedSeasonNum = getSelectedSeasonNum(selectedSeason);
        if (selectedSeasonNum === -1) {
          d3.selectAll(".journey-path").remove();
          d3.select("#selected-team").remove();
          d3.select("#selected-team-label").remove();
          d3.select("#selected-player").remove();
          d3.select("#selected-player-label").remove();
          return null;
        }
        const selectedSeasonData = filterJourneyDataBySeason(
          journeyData,
          selectedSeasonNum
        );
        const teamNamesInSeason = getUniqueTeamNames(selectedSeasonData);
        const sortedTeamNames = [
          "--Team--",
          ...sortTeamNames(teamNamesInSeason),
        ];

        populateDropdown(teamSelect, sortedTeamNames);
      }

      function generateSeasons(startYear, endYear) {
        const seasons = [];
        for (let i = startYear; i < endYear; i++) {
          seasons.push(`${i}-${(i + 1).toString().slice(-2)}`);
        }
        return seasons;
      }

      function populateDropdown(selectElement, options) {
        selectElement
          .selectAll("option")
          .data(options)
          .join("option")
          .attr("value", (d) => d)
          .text((d) => d);
      }

      function getSelectedSeasonNum(selectedSeason) {
        if (selectedSeason === "--Season--") return -1;
        return (Number(selectedSeason.slice(0, 4)) + 1).toString();
      }

      function filterJourneyDataBySeason(journeyData, selectedSeasonNum) {
        return journeyData.filter((d) => d.season === selectedSeasonNum);
      }

      function getUniqueTeamNames(data) {
        return Array.from(new Set(data.map((d) => d.team)));
      }

      function sortTeamNames(teamNames) {
        return teamNames.sort((a, b) => a.localeCompare(b));
      }

      function filterTeamDataByNickname(teamData, selectedTeam) {
        return teamData.filter((d) => d.nickname === selectedTeam);
      }

      function handlePlayerSelect() {
        const selectedPlayer = d3.select(this).property("value");
        const journeyPaths = svg.selectAll(".journey-path");

        journeyPaths.style("stroke-width", (d, i) => {
          const playerName = d.properties.player;
          return playerName === selectedPlayer ? 3 : 0.5;
        });
      }

      function getUniquePlayerNames(data) {
        return Array.from(new Set(data.map((d) => d.player_name)));
      }

      function sortPlayerNames(playerNames) {
        return playerNames.sort((a, b) => a.localeCompare(b));
      }

      function filterJourneyDataByTeam(data, selectedTeam) {
        return data.filter((d) => d.team === selectedTeam);
      }

      // for each player in playerNames, get the player's journey data
      function getPlayerJourneyData(playerNames, journeyData) {
        const selectedSeason = seasonSelect.property("value");
        const selectedSeasonNum = getSelectedSeasonNum(selectedSeason);
        return playerNames.map((playerName) => {
          return journeyData
            .filter(
              (d) =>
                d.player_name === playerName && d.season <= selectedSeasonNum
            )
            .map((row) => row.team);
        });
      }

      function getJourneyCoords(journeys) {
        // get the coordinates of each team in the journey
        return journeys.map((journey) => {
          return journey.map((team) => {
            // if teamRow has more than one row, then the team has multiple abbreviations in `team.csv`
            const teamRow = teamData.filter((d) => d.nickname === team)[0];
            return [teamRow.longitude, teamRow.latitude];
          });
        });
      }

      function drawJourneyPaths(
        svg,
        journeyCoords,
        projection,
        sortedPlayerNames
      ) {
        const pathGenerator = getGeoGenerator(projection);

        const features = journeyCoords.flatMap((journey, index) =>
          journey.slice(0, -1).map((coord, innerIndex) => ({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [coord, journey[innerIndex + 1]],
            },
            properties: {
              player: sortedPlayerNames[index], // Assign player name to each path
            },
          }))
        );

        let journeyPaths = svg
          .selectAll(".journey-path")
          .data(features)
          .join("path")
          .attr("class", "journey-path")
          .attr("id", (d, i) => `journey-path-${i}`) // Add a unique identifier to each path
          .attr("d", pathGenerator)
          .style("fill", "none")
          .style("stroke", "gray")
          .style("stroke-width", 0.7);

        journeyPaths
          .on("mouseover", function (event, d) {
            const playerName = d.properties.player;

            svg
              .selectAll(".journey-path")
              .filter(function (pathData) {
                return pathData.properties.player === playerName;
              })
              .transition()
              .duration(50)
              .style("stroke-width", "3px");

            const [x, y] = d3.pointer(event, svg.node());

            svg
              .append("text")
              .attr("id", "tooltip")
              .attr("x", x + 10)
              .attr("y", y - 10)
              .text(playerName);
          })
          .on("mouseout", function (event, d) {
            const playerName = d.properties.player;
            svg
              .selectAll(".journey-path")
              .filter(function (pathData) {
                return pathData.properties.player === playerName;
              })
              .transition()
              .duration(50)
              .style("stroke-width", "0.7px");
            svg.select("#tooltip").remove();
          });
      }
    }

    let projection = this.createProjection();

    let svg = this.svg; // can't use this.svg in .then()

    //Load in GeoJSON data
    Promise.all([
      d3.json(
        "https://code.highcharts.com/mapdata/countries/us/us-all.topo.json"
      ),
      d3.json(
        "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
      ),
    ]).then(function (values) {
      let usjson = values[0];
      let cajson = values[1];
      let geojson = createGeojson(usjson, cajson);

      svg
        .selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", getGeoGenerator(projection))
        .style("fill-opacity", 0)
        .style("stroke", "#333")
        .style("stroke-width", function (d) {
          if (d.properties.country === "United States of America") {
            return 1.25;
          } else {
            return 0.5;
          }
        });
      Promise.all([d3.csv("team.csv"), d3.csv("journey.csv")]).then(function (
        values
      ) {
        let teamData = values[0];
        let journeyData = values[1];
        // create a dropdown menu to select a team
        createCircles(svg, teamData, projection);
        createDropdown(svg, teamData, journeyData, projection);
      });
    });
  }

  createProjection() {
    //Define map projection
    let projection = d3
      .geoAlbersUsa()
      .translate([this.svg_width / 2, this.svg_height / 2])
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

function initMap() {
  map_object = new NBAMap("map", "map-container");
}
