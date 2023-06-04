const DEFAULTSTROKEWIDTH = 0.5;
const DEFAULTIMAGESIZE = 30;

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

      Promise.all([
        d3.csv("datasets/team.csv"),
        d3.csv("datasets/journey.csv"),
        d3.csv("datasets/common_player_info.csv"),
      ]).then((values) => {
        let teamData = values[0];
        let journeyData = values[1];
        this.commonPlayerData = values[2];
        // create a dropdown menu to select a team
        this.createCircles(this.svg, teamData, projection);
        this.createDropdown(this, this.svg, teamData, journeyData, projection);
      });
    });
  }

  createCircles(svg, data, projection) {
    // Create image elements and tooltip labels
    const images = svg
      .selectAll("image")
      .data(data)
      .join("image")
      .attr(
        "x",
        (d) => projection([d.longitude, d.latitude])[0] - DEFAULTIMAGESIZE / 2
      )
      .attr(
        "y",
        (d) => projection([d.longitude, d.latitude])[1] - DEFAULTIMAGESIZE / 2
      )
      .attr("id", (d) => d.id)
      .attr("width", DEFAULTIMAGESIZE)
      .attr("height", DEFAULTIMAGESIZE)
      .attr("class", (d) => `map-logo team-${d.id}`)
      .attr("xlink:href", (d) => {
        return `https://cdn.nba.com/logos/nba/${d.id}/global/L/logo.svg`; // Replace with the NBA logo path or URL for each team
      })
      .style("opacity", 0.8);

    images.append("title").text((d) => `${d.nickname} (${d.city})`);

    images
      .on("mouseover", (event, d) => {
        const image = d3.select(event.currentTarget);
        if (image.attr("id") === "selected-team") return null;
        image
          .transition()
          .duration(200)
          .attr("width", DEFAULTIMAGESIZE + 10)
          .attr("height", DEFAULTIMAGESIZE + 10)
          .style("opacity", 1);
      })
      .on("mouseout", (event, d) => {
        const image = d3.select(event.currentTarget);
        if (image.attr("id") === "selected-team") return null;
        image
          .transition()
          .duration(200)
          .attr("width", DEFAULTIMAGESIZE)
          .attr("height", DEFAULTIMAGESIZE)
          .style("opacity", 0.8);
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

  calculateControlPoints(source, target, offset, pointIndex) {
  console.log(pointIndex);
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const normal = [-dy / length, dx / length];
  const controlPointOffset = offset * (pointIndex % 2 ? 1 : -1);
  const controlPoint = [
    ((+source[0] + +target[0]) / 2) + (controlPointOffset * normal[0]),
    ((+source[1] + +target[1]) / 2) + (controlPointOffset * normal[1]),
  ];
  return controlPoint;
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
    const seasonSelect = d3.select("#map-season-select");
    const teamSelect = d3.select("#map-team-select");
    const playerSelect = d3.select("#map-player-select");

    seasonSelect.on(
      "change",
      self.createSeasonSelectHandlerDD(
        self,
        journeyData,
        teamSelect,
        projection
      )
    );
    const seasons = ["--Season--", ...self.generateSeasons(2002, 2023)];
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

    playerSelect.on(
      "change",
      self.createPlayerSelectHandlerDD(self, svg, projection)
    );
    self.populateDropdown(playerSelect, ["--Player--"]);
  }

  createSeasonSelectHandlerDD(self, journeyData, teamSelect, projection) {
    return function () {
      const selectedSeason = d3.select(this).property("value");
      const selectedSeasonNum = self.getSelectedSeasonNum(selectedSeason);
      if (selectedSeasonNum === -1) {
        d3.selectAll(".journey-path").remove();
        self.resetDefaultTeamLogo(d3.select("#selected-team"), projection);
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
        self.resetDefaultTeamLogo(d3.select("#selected-team"), projection);
        var playerContainer = d3.select("#player-container");
        playerContainer.html("");
        return null;
      }
      const selectedTeamData = self.filterTeamDataByNickname(
        teamData,
        selectedTeam
      )[0];
      const selectedTeamCoords = [
        selectedTeamData.longitude,
        selectedTeamData.latitude,
      ];
      const projected = projection(selectedTeamCoords);

      if (!projected) return null;
      self.resetDefaultTeamLogo(d3.select("#selected-team"), projection);

      const imageSize = 60;
      // Modify the existing team logo image
      d3.selectAll(".map-logo")
        .filter((d) => d.nickname === selectedTeam)
        .attr("x", projected[0] - imageSize / 2)
        .attr("y", projected[1] - imageSize / 2)
        .attr("id", "selected-team")
        .attr("width", imageSize)
        .attr("height", imageSize);

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

      var playerContainer = d3.select("#player-container");
      playerContainer.html("");

      // this is a list of journeys of each player in the selected team
      const journeys = self.getPlayerJourneyData(
        selectedSeasonNum,
        selectedTeam,
        sortedPlayerNames,
        journeyData
      );
      const journeyCoords = self.getJourneyCoords(self, journeys, teamData);
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

  resetDefaultTeamLogo(logoElement, projection, imageSize = DEFAULTIMAGESIZE) {
    logoElement
      .attr(
        "x",
        (d) => projection([d.longitude, d.latitude])[0] - imageSize / 2
      )
      .attr(
        "y",
        (d) => projection([d.longitude, d.latitude])[1] - imageSize / 2
      )
      .attr("id", (d) => d.id)
      .attr("width", imageSize)
      .attr("height", imageSize)
      .style("opacity", 0.8);
  }

  createPlayerSelectHandlerDD(self, svg, projection) {
    return function () {
      const selectedPlayer = d3.select(this).property("value");
      const journeyPaths = svg.selectAll(".journey-path");

      self.handlePlayerSelect(self, journeyPaths, selectedPlayer, projection);
    };
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
      return journey.slice(0, -1).map((coord, innerIndex) => {
        const controlPoint = self.calculateControlPoints(
          projection(coord.map(x=>+x)),
          projection(journey[innerIndex + 1].map(x=>+x)),
          75,
          innerIndex
        );
        console.log(controlPoint)

        return {
          type: "Feature",
          geometry: {
            type: "Path",
            coordinates: [projection(coord.map(x=>+x)), controlPoint, projection(journey[innerIndex + 1].map(x=>+x))],
          },
          properties: {
            player: sortedPlayerNames[index],
            destTeamId: journey[innerIndex + 1][2],
          },
        };
      });
    });

    let journeyPaths = svg
    .selectAll(".journey-path")
    .data(features)
    .join("path")
    .attr("class", "journey-path")
    .attr("id", (d, i) => `journey-path-${i}`)
    .attr("d", (d) => {
      var [start, control, end] = d.geometry.coordinates;
      // start = start.map(x=>+x);
      // end = end.map(x=>+x);
      // console.log([start.map(x=>+x), control.map(x=>+x), end.map(x=>+x)]);
      // start = projection(start.map(x=>+x))
      // end = projection(end.map(x=>+x))

      return `M${start[0]},${start[1]} Q${control[0]},${control[1]} ${end[0]},${end[1]}`;
    })
    .style("fill", "none")
    .style("stroke", "gray")
    .style("stroke-width", DEFAULTSTROKEWIDTH);

    journeyPaths
      .on(
        "mouseover",
        self.createMouseHoverHandlerJourneyPath(svg, playerSelect)
      )
      .on(
        "mouseout",
        self.createMouseHoverHandlerJourneyPath(svg, playerSelect)
      )
      .on(
        "click",
        self.createMouseClickHandlerJourneyPath(
          self,
          svg,
          playerSelect,
          projection
        )
      );
  }

  handlePlayerSelect(self, journeyPaths, selectedPlayer, projection) {
    const dur = 1000;
    journeyPaths.style("stroke-width", (d, i) => {
      if (selectedPlayer === "--Player--") return DEFAULTSTROKEWIDTH;
      return 0;
    });
    if (selectedPlayer === "--Player--") return null;
    // call animatePath on the selected player, for each feature in the path, call animatePath
    const selectedJourneyPath = journeyPaths.filter((d, i) => {
      return d.properties.player === selectedPlayer;
    });
    selectedJourneyPath.style("stroke-width", DEFAULTSTROKEWIDTH);
    const selectedJourneyPathFeatures = selectedJourneyPath.data();
    let delay = 0;
    selectedJourneyPathFeatures.forEach((feature) => {
      setTimeout(() => {
        self.animatePath(self, feature, projection, dur, journeyPaths);
      }, delay);
      delay += dur;
    });
    const foundPlayer = self.commonPlayerData.find(
      (d) => d.display_first_last === selectedPlayer
    );

    // Select the player container to create the player card
    var playerContainer = d3.select("#player-container");

    // Create a box to enclose the player card
    const playerCard = playerContainer
      .append("div")
      .attr("class", "player-card");

    playerCard
      .append("img")
      .attr("class", "player-image")
      .attr(
        "src",
        "https://cdn.nba.com/headshots/nba/latest/260x190/" +
          foundPlayer.person_id +
          ".png"
      )
      // in case http request failed, which it does for most older players, don't display any image
      .on("error", function () {
        d3.select(this).style("display", "none");
      });

    // Append the player name
    playerCard.append("div").attr("class", "player-name").text(selectedPlayer);

    // Append the stats
    playerCard
      .append("div")
      .attr("class", "last-affiliation")
      .text(`Pre-NBA affiliation: ${foundPlayer.last_affiliation}`);
  }

  animatePath(self, feature, projection, dur, journeyPaths) {
    let pathGenerator = self.getGeoGenerator(projection);
    let path = self.svg
      .append("path")
      .datum(feature)
      .attr("class", "animated-path")
      .attr("d", (d) => {
        var [start, control, end] = d.geometry.coordinates;
        // start = start.map(x=>+x);
        // end = end.map(x=>+x);
        // console.log([start.map(x=>+x), control.map(x=>+x), end.map(x=>+x)]);
        // start = projection(start.map(x=>+x))
        // end = projection(end.map(x=>+x))

        return `M${start[0]},${start[1]} Q${control[0]},${control[1]} ${end[0]},${end[1]}`;
      })
      .style("fill", "none")
      .style("stroke", "green")
      .style("stroke-width", 2);
    let totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(dur)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0)
      .transition()
      .duration(dur)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", -totalLength)
      .remove();

    // Get the coordinates of the destination point
    let projected = feature.geometry.coordinates[2];
    // let projected = projection(pointCoords);

    const imageSize = 60; // Adjust the size of the logo image

    self.svg
      .append("image")
      .attr("x", projected[0] - imageSize / 2)
      .attr("y", projected[1] - imageSize / 2)
      .attr("width", imageSize)
      .attr("height", imageSize)
      .attr("xlink:href", () => {
        return `https://cdn.nba.com/logos/nba/${feature.properties.destTeamId}/global/L/logo.svg`;
      })
      .style("opacity", 0)
      .transition()
      .duration(dur * 2)
      .style("opacity", 1)
      .transition()
      .duration(dur * 2)
      .style("opacity", 0)
      .remove();
  }

  createMouseClickHandlerJourneyPath(self, svg, playerSelect, projection) {
    return function (event, d) {
      const journeyPaths = svg.selectAll(".journey-path");
      const selectedPlayer = d.properties.player;

      self.handlePlayerSelect(self, journeyPaths, selectedPlayer, projection);

      // also modify the dropdown
      playerSelect.property("value", selectedPlayer);
    };
  }

  createMouseHoverHandlerJourneyPath(svg, playerSelect) {
    // mouseover: increase stroke width of the path of the hovered player
    // mouseout: decrease stroke width of the path of the hovered player
    return function (event, d) {
      const hoveredPlayerName = d.properties.player;
      // event type is either "mouseover" or "mouseout"
      const isMouseOver = event.type === "mouseover";

      svg
        .selectAll(".journey-path")
        .filter((pathData) => {
          const isHoveredPath =
            pathData.properties.player === hoveredPlayerName;
          const isNotSelectedPath =
            pathData.properties.player !== playerSelect.property("value");
          const isNotAllPathsSelected =
            playerSelect.property("value") !== "--Player--";
          return (
            isHoveredPath &&
            (isMouseOver || isNotSelectedPath || isNotAllPathsSelected)
          );
        })
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
          .text(hoveredPlayerName);
      } else {
        svg.select("#tooltip").remove();
      }
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
  getPlayerJourneyData(
    selectedSeasonNum,
    selectedTeam,
    playerNames,
    journeyData
  ) {
    return playerNames.map((playerName) => {
      const playerTeams = journeyData
        .filter(
          (d) => d.player_name === playerName && d.season <= selectedSeasonNum
        )
        .map((row) => row.team);
      // only keep a list of teams where each team does not repeat consecutively
      const uniquePlayerTeams = playerTeams.filter(
        (team, i) => i === 0 || team !== playerTeams[i - 1]
      );
      // the returned list of teams should end with the selected team
      const finalTeamIndex = uniquePlayerTeams.lastIndexOf(selectedTeam);
      if (finalTeamIndex !== -1) {
        return uniquePlayerTeams.slice(0, finalTeamIndex + 1);
      }
      return uniquePlayerTeams;
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

  getJourneyCoords(self, journeys, teamData) {
    // get the coordinates of each team in the journey
    return journeys.map((journey) => {
      return journey.map((team) => {
        // if teamRow has more than one row, then the team has multiple abbreviations in `team.csv`
        const teamRow = self.filterTeamDataByNickname(teamData, team)[0];
        return [teamRow.longitude, teamRow.latitude, teamRow.id];
      });
    });
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
  map_object = new NBAMap("journey-map", "journey-map-container");
}
