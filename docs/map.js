const DEFAULTSTROKEWIDTH = 0.5;

class NBAMap {
  constructor(svg_id, div_id) {
    this.svg = d3.select("#" + svg_id);
    //Get the svg dimensions
    const svg_viewbox = this.svg.node().viewBox.animVal;
    this.svg_width = svg_viewbox.width;
    this.svg_height = svg_viewbox.height;

    let projection = this.createProjection();

    //Load in GeoJSON data
    Promise.all([
      d3.json(
        "https://code.highcharts.com/mapdata/countries/us/us-all.topo.json"
      ),
      d3.json(
        "https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json"
      ),
    ]).then((values) => {
      let usjson = values[0];
      let cajson = values[1];
      let geojson = this.createGeojson(usjson, cajson);

      this.svg
        .selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", this.getGeoGenerator(projection))
        .style("fill-opacity", 0)
        .style("stroke", "#333")
        .style("stroke-width", (d) => {
          if (d.properties.country === "United States of America") {
            return 1.25;
          } else {
            return DEFAULTSTROKEWIDTH;
          }
        });

      Promise.all([d3.csv("team.csv"), d3.csv("journey.csv")]).then(
        (values) => {
          let teamData = values[0];
          let journeyData = values[1];
          // create a dropdown menu to select a team
          this.createCircles(this.svg, teamData, projection);
          this.createDropdown(
            this,
            this.svg,
            teamData,
            journeyData,
            projection
          );
        }
      );
    });
  }

  createCircles(svg, data, projection) {
    // Create circles and tooltip labels
    const circles = svg
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
      .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
      .attr("r", 5)
      .style("fill", "red")
      .style("stroke", "gray")
      .style("stroke-width", 0.25)
      .style("opacity", 0.75);

    circles.append("title").text((d) => `${d.nickname} (${d.city})`);

    circles
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
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
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("r", 5)
          .style("fill", "red");
        svg.select("#tooltip").remove();
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

  getGeoGenerator(projection) {
    return d3.geoPath().projection(projection);
  }

  createGeojson(usjson, cajson) {
    //Load in GeoJSON data
    let usFeatures = topojson.feature(usjson, usjson.objects.default).features;
    let caFeatures = topojson.feature(cajson, cajson.objects.default).features;
    let geojson = {
      type: "FeatureCollection",
      features: usFeatures.concat(caFeatures),
    };
    return geojson;
  }

  createDropdown(self, svg, teamData, journeyData, projection) {
    const seasonSelect = d3
      .select("#map-season-select")
      .attr("id", "season-select");

    const teamSelect = d3.select("#map-team-select").attr("id", "team-select");

    const playerSelect = d3
      .select("#map-player-select")
      .attr("id", "player-select");

    seasonSelect.on(
      "change",
      self.createSeasonSelectHandlerDD(self, journeyData, teamSelect)
    );
    const seasons = ["--Season--", ...self.generateSeasons(1977, 2023)];
    self.populateDropdown(seasonSelect, seasons);

    teamSelect.on(
      "change",
      self.createTeamSelectHandlerDD(
        self,
        svg,
        journeyData,
        teamData,
        seasonSelect,
        projection,
        playerSelect
      )
    );
    self.populateDropdown(teamSelect, ["--Team--"]);

    playerSelect.on("change", self.createPlayerSelectHandlerDD(self, svg));
    self.populateDropdown(playerSelect, ["--Player--"]);
  }

  createSeasonSelectHandlerDD(self, journeyData, teamSelect) {
    return function () {
      const selectedSeason = d3.select(this).property("value");
      const selectedSeasonNum = self.getSelectedSeasonNum(selectedSeason);
      if (selectedSeasonNum === -1) {
        d3.selectAll(".journey-path").remove();
        d3.select("#selected-team").remove();
        d3.select("#selected-team-label").remove();
        d3.select("#selected-player").remove();
        d3.select("#selected-player-label").remove();
        return null;
      }
      const selectedSeasonData = self.filterJourneyDataBySeason(
        journeyData,
        selectedSeasonNum
      );
      const teamNamesInSeason = self.getUniqueTeamNames(selectedSeasonData);
      const sortedTeamNames = [
        "--Team--",
        ...self.sortTeamNames(teamNamesInSeason),
      ];

      self.populateDropdown(teamSelect, sortedTeamNames);

      const selectedTeam = teamSelect.property("value");
      teamSelect.property(
        "value",
        sortedTeamNames.includes(selectedTeam)
          ? selectedTeam
          : sortedTeamNames[0]
      );
      teamSelect.dispatch("change");
    };
  }

  createTeamSelectHandlerDD(
    self,
    svg,
    journeyData,
    teamData,
    seasonSelect,
    projection,
    playerSelect
  ) {
    return function () {
      d3.selectAll(".journey-path").remove();
      const selectedSeason = seasonSelect.property("value");
      const selectedSeasonNum = self.getSelectedSeasonNum(selectedSeason);
      if (selectedSeasonNum === -1) {
        // we don't do anything here
        return null;
      }
      const selectedSeasonData = self.filterJourneyDataBySeason(
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
      const selectedTeamData = self.filterTeamDataByNickname(
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

      const selectedSeasonAndTeamData = self.filterJourneyDataByTeam(
        selectedSeasonData,
        selectedTeam
      );
      const playerNamesInSeasonAndTeam = self.getUniquePlayerNames(
        selectedSeasonAndTeamData
      );
      const sortedPlayerNames = [
        "--Player--",
        ...self.sortPlayerNames(playerNamesInSeasonAndTeam),
      ];

      self.populateDropdown(playerSelect, sortedPlayerNames);
      playerSelect.property("value", sortedPlayerNames[0]);

      // this is a list of journeys of each player in the selected team
      const journeys = self.getPlayerJourneyData(
        self,
        seasonSelect,
        sortedPlayerNames,
        journeyData
      );
      const journeyCoords = self.getJourneyCoords(journeys, teamData);
      // for each journey, draw a path
      self.drawJourneyPaths(
        self,
        svg,
        journeyCoords,
        projection,
        sortedPlayerNames,
        playerSelect
      );
    };
  }

  sortPlayerNames(playerNames) {
    return playerNames.sort((a, b) => a.localeCompare(b));
  }

  generateSeasons(startYear, endYear) {
    const seasons = [];
    for (let i = startYear; i < endYear; i++) {
      seasons.push(`${i}-${(i + 1).toString().slice(-2)}`);
    }
    return seasons;
  }

  populateDropdown(selectElement, options) {
    selectElement
      .selectAll("option")
      .data(options)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);
  }

  getSelectedSeasonNum(selectedSeason) {
    if (selectedSeason === "--Season--") return -1;
    return (Number(selectedSeason.slice(0, 4)) + 1).toString();
  }

  filterJourneyDataBySeason(journeyData, selectedSeasonNum) {
    return journeyData.filter((d) => d.season === selectedSeasonNum);
  }

  getUniqueTeamNames(data) {
    return Array.from(new Set(data.map((d) => d.team)));
  }

  sortTeamNames(teamNames) {
    return teamNames.sort((a, b) => a.localeCompare(b));
  }

  // for each player in playerNames, get the player's journey data
  getPlayerJourneyData(self, seasonSelect, playerNames, journeyData) {
    const selectedSeason = seasonSelect.property("value");
    const selectedSeasonNum = self.getSelectedSeasonNum(selectedSeason);
    return playerNames.map((playerName) => {
      return journeyData
        .filter(
          (d) => d.player_name === playerName && d.season <= selectedSeasonNum
        )
        .map((row) => row.team);
    });
  }

  getUniquePlayerNames(data) {
    return Array.from(new Set(data.map((d) => d.player_name)));
  }

  filterJourneyDataByTeam(data, selectedTeam) {
    return data.filter((d) => d.team === selectedTeam);
  }

  filterTeamDataByNickname(teamData, selectedTeam) {
    return teamData.filter((d) => d.nickname === selectedTeam);
  }

  getJourneyCoords(journeys, teamData) {
    // get the coordinates of each team in the journey
    return journeys.map((journey) => {
      return journey.map((team) => {
        // if teamRow has more than one row, then the team has multiple abbreviations in `team.csv`
        const teamRow = teamData.filter((d) => d.nickname === team)[0];
        return [teamRow.longitude, teamRow.latitude];
      });
    });
  }

  drawJourneyPaths(
    self,
    svg,
    journeyCoords,
    projection,
    sortedPlayerNames,
    playerSelect
  ) {
    const pathGenerator = self.getGeoGenerator(projection);

    const features = journeyCoords.flatMap((journey, index) => {
      return journey.slice(0, -1).map((coord, innerIndex) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [coord, journey[innerIndex + 1]],
        },
        properties: {
          player: sortedPlayerNames[index],
        },
      }));
    });

    let journeyPaths = svg
      .selectAll(".journey-path")
      .data(features)
      .join("path")
      .attr("class", "journey-path")
      .attr("id", (d, i) => `journey-path-${i}`)
      .attr("d", pathGenerator)
      .style("fill", "none")
      .style("stroke", "gray")
      .style("stroke-width", DEFAULTSTROKEWIDTH);

    journeyPaths
      .on(
        "mouseover",
        self.createMouseOverHandlerOutJourneyPath(svg, playerSelect)
      )
      .on(
        "mouseout",
        self.createMouseOverHandlerOutJourneyPath(svg, playerSelect)
      )
      .on(
        "click",
        self.createMouseClickHandlerJourneyPath(self, svg, playerSelect)
      );
  }

  createPlayerSelectHandlerDD(self, svg) {
    return function () {
      const selectedPlayer = d3.select(this).property("value");
      const journeyPaths = svg.selectAll(".journey-path");

      self.handlePlayerSelect(journeyPaths, selectedPlayer);
    };
  }

  createMouseClickHandlerJourneyPath(self, svg, playerSelect) {
    return function (event, d) {
      const journeyPaths = svg.selectAll(".journey-path");
      const selectedPlayer = d.properties.player;

      self.handlePlayerSelect(journeyPaths, selectedPlayer);

      // also modify the dropdown
      playerSelect.property("value", selectedPlayer);
    };
  }

  handlePlayerSelect(journeyPaths, selectedPlayer) {
    journeyPaths.style("stroke-width", (d, i) => {
      const playerName = d.properties.player;
      if (selectedPlayer === "--Player--") return DEFAULTSTROKEWIDTH;
      return playerName === selectedPlayer ? 3 : 0;
    });
  }

  createMouseOverHandlerOutJourneyPath(svg, playerSelect) {
    return function (event, d) {
      const playerName = d.properties.player;
      // event type is either "mouseover" or "mouseout"
      const isMouseOver = event.type === "mouseover";

      svg
        .selectAll(".journey-path")
        .filter(
          (pathData) =>
            pathData.properties.player === playerName &&
            (isMouseOver
              ? true
              : pathData.properties.player !== playerSelect.property("value"))
        )
        .transition()
        .duration(50)
        .style("stroke-width", isMouseOver ? "3px" : `${DEFAULTSTROKEWIDTH}px`); // can't use number here for some reason

      if (isMouseOver) {
        const [x, y] = d3.pointer(event, svg.node());

        svg
          .append("text")
          .attr("id", "tooltip")
          .attr("x", x + 10)
          .attr("y", y - 10)
          .text(playerName);
      } else {
        svg.select("#tooltip").remove();
      }
    };
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
