window.onload = function(){


  L.mapbox.accessToken = 'pk.eyJ1Ijoic3NtIiwiYSI6IkFsRTJFNDAifQ.k7_1MScHyFU44SbXlC3x8w';
  var map = L.mapbox.map('map', 'ssm.ld63nlnh')
    .setView([0,0], 3);



  var svg = d3.select(map.getPanes().overlayPane).append("svg");
  var g = svg.append("g");//.attr("class", "leaflet-zoom-hide");



  // UNCOMMENT FOR SVG WORLD
  //-------------------------
  // var width = 940,
  //   height = 480;

  // var projection = d3.geo.equirectangular()
  //   .scale(153)
  //   .translate([width / 2, height / 2])
  //   .precision(.1);

  // var path = d3.geo.path()
  //   .projection(projection);

  // var graticule = d3.geo.graticule();
  // var svg = d3.select("#viz").append("svg")
  //   .attr("width", width)
  //   .attr("height", height);

  // svg.append("path")
  //   .datum(graticule)
  //   .attr("class", "graticule")
  //   .attr("d", path);


  queue()//.defer(d3.json, "./data/world-110m.json")
    .defer(function(url, callback){
      d3.csv(url, function(d){
        return {
          category: d.Category,
          name: d.Name,
          aptDate: new Date(+d.AppointmentDate, 0, 1),
          lat: +d.La,
          lon: +d.Lo,
          place: d.Place,
          notes: d.Notes,
          degree: d.Degree
        };
      }, function(error, rows){
        callback(error, rows);
      });
    }, "./data/mapping-alumni.csv")
    .await(function(err, alumni){
      // loadWorld(err, world);
      loadAlumni(err, alumni);
    });

  function loadAlumni(err, alumni) {

    render();
    map.on("viewreset", render);
    

    function render() {

      alumni = alumni.map(function(d) {
        d.lat = isNaN(d.lat) ? 0 : d.lat;
        d.lon = isNaN(d.lon) ? 0 : d.lon;

        var p = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon));
        d.x = p.x;
        d.y = p.y;

        return d;
      });


      var lats = alumni.map(function(d){
        return d.x;
      });
      var lons = alumni.map(function(d){
        return d.y;
      });


      var bounds = [[Math.min.apply(null,lats),Math.min.apply(null,lons)] , [Math.max.apply(null,lats),Math.max.apply(null,lons)]];
        topLeft = bounds[0],
        bottomRight = bounds[1];

      svg.attr("width", bottomRight[0] - topLeft[0] + 120)
        .attr("height", bottomRight[1] - topLeft[1] + 120)
        .style("left", topLeft[0] - 50 + "px")
        .style("top", topLeft[1] - 50 + "px");

      g.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

      g.selectAll("circle.point")
        .data(alumni)
        .enter()
        .append("circle")
        .attr("r",3)
        .attr('class', 'point')
        .transition().duration(5000)
        .attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        })
        .attr('style', function(d) {
          var c = map.latLngToLayerPoint(new L.LatLng(0,0));
          if((d.x === c.x) && (d.y === c.y))
            return "display: none";
        });

      g.selectAll("circle.point")
        .data(alumni) 
        .transition()
        .attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        });
    }


  }

  function loadWorld(err, world) {
    svg.insert("path", ".graticule")
      .datum(topojson.feature(world, world.objects.land))
      .attr("class", "land")
      .attr("d", path);

    svg.insert("path", ".graticule")
      .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
      .attr("class", "boundary")
      .attr("d", path);
  }

  // d3.select(self.frameElement).style("height", height + "px");


}