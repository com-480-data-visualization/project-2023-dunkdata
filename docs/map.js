class NBAMap {

    constructor(svg_id, div_id) {
        this.svg = d3.select('#' + svg_id);

		//Get the svg dimensions
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

        let getGeoGenerator = function(projection) {
            return d3.geoPath().projection(projection);
        }
        
        let createGeojson = function(usjson, cajson) {
            //Load in GeoJSON data
            let usFeatures = topojson.feature(usjson, usjson.objects.default).features;
            let caFeatures = topojson.feature(cajson, cajson.objects.default).features;
            let geojson = {type: "FeatureCollection", features: usFeatures.concat(caFeatures)};
            return geojson;
        }
        
        let createCircles = function(svg, data, projection) {
            // Create circles and tooltip labels
            let circles = svg.selectAll("circle")
                .data(data)
                .join("circle")
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

            circles.append("title")
                .text(function(d) {
                    return d.nickname + " (" + d.city+ ")";
                });

            circles.on("mouseover", function(event, d) {
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 10)
                    .style("fill", "orange");
                    let projected = projection([d.longitude, d.latitude]);
                    svg.append("text")
                    .attr("id", "tooltip")
                    .attr("x", projected[0] + 10)
                    .attr("y", projected[1] + 10)
                    .text(d.nickname);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 5)
                    .style("fill", "red");

                    svg.select("#tooltip").remove();
                });
        }
        
        //Width and height
        // let w = this.svg_width;
        // let h = this.svg_height;

        let projection = this.createProjection();
        // let svg = createSvgElement(w, h);
        let svg = this.svg; // can't use this.svg in .then()

        //Load in GeoJSON data
        Promise.all([
            d3.json("https://code.highcharts.com/mapdata/countries/us/us-all.topo.json"),
            d3.json("https://code.highcharts.com/mapdata/countries/ca/ca-all.topo.json")
        ]).then(function(values) {
            let usjson = values[0];
            let cajson = values[1];
            let geojson = createGeojson(usjson, cajson);

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

            d3.csv("team.csv").then(function(data) {
                createCircles(svg, data, projection);
            });
        });

        // test coords only, will load actual data later
        let dur = 200; // Duration of animation in milliseconds
        let atlantaCoords = [-84.39, 33.75];
        let bostonCoords = [-71.06, 42.36];
        let laCoords = [-118.25, 34.05];
        let chicagoCoords = [-87.63, 41.88];
        let parisCoords = [2.35, 48.86];
        let coords = [parisCoords, bostonCoords, atlantaCoords, laCoords, chicagoCoords];

        let drawPath = function(feature, dur) {
            let pathGenerator = getGeoGenerator(projection);
            let path = svg.append("path")
                .datum(feature)
                .attr("class", "animated-path")
                .attr("d", pathGenerator)
                .style("fill", "none")
                .style("stroke", "green")
                .style("stroke-width", 2);
            let totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", totalLength + " " + totalLength)
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
            let pointCoords = feature.geometry.coordinates[1];
            let projected = projection(pointCoords);
            if (!projected) return null;
            // Create a circle element at the point coordinates
            let circle = svg.append("circle")
                .attr("cx", projected[0])
                .attr("cy", projected[1])
                .attr("r", 8)
                .attr("class", "animated-circle")
                .style("fill", "orange")
                .style("opacity", 0)
                .transition()
                .duration(dur*2)
                .style("opacity", 1)
                .transition()
                .duration(dur*2)
                .style("opacity", 0)
                .remove();
        }

        let drawMovement = function() {
            let features = [];
            for (let i = 0; i < coords.length - 1; i++) {
                let feature = {
                    type: "Feature",
                    geometry: {
                    type: "LineString",
                    coordinates: [coords[i], coords[i+1]]
                    },
                    properties: {}
                };
                features.push(feature);
            }

            let delay = 0;
            features.forEach(function(feature, i) {
                setTimeout(function() {
                    if (!isPaused) {
                        drawPath(feature, dur);
                    }
                }, delay);
                delay += dur;
            });
        }

        let isPaused = false; // Flag to check if animation is paused
        let animationInterval = null; // Interval for the animation

        let createAnimationInterval = function() {
            if (animationInterval === null) {
                animationInterval = window.setInterval(
                    function() {drawMovement(); return drawMovement}(),
                    dur*(coords.length-1)
                );
            }
        };

        setTimeout(createAnimationInterval, 500);

        // the pause button is very janky
        let createPauseButton = function() {
            // Create a pause button and add it to the page
            let button = d3.select("#" + div_id)
                .append("button")
                .attr("id", "pause-button")
                .text("Pause");
            button.on("click", function() {
                if (isPaused) {
                    createAnimationInterval();
                } else {
                    window.clearInterval(animationInterval);
                    d3.selectAll(".animated-path").interrupt().remove();
                    d3.selectAll(".animated-circle").interrupt().remove();
                    animationInterval = null; // Clear the interval
                }
                isPaused = !isPaused;
            });
        }

        // Call the function to create the pause button
        createPauseButton();
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

function initMap() {
	map_object = new NBAMap("map", "map-container");
}
