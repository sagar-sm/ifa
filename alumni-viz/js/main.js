window.onload = function(){
  var width = 940,
    height = 480;

  var projection = d3.geo.equirectangular()
    .scale(153)
    .translate([width / 2, height / 2])
    .precision(.1);

  var path = d3.geo.path()
    .projection(projection);

  var graticule = d3.geo.graticule();

  var svg = d3.select("#viz").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);


  queue()
    .defer(d3.json, "./data/world-110m.json")
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
    .await(function(err, world, alumni){
      loadWorld(err, world);
      loadAlumni(err, alumni);
    });

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

  function loadAlumni(err, alumni) {
    console.log("hi");
    console.log(alumni);
  }

  d3.select(self.frameElement).style("height", height + "px");
}