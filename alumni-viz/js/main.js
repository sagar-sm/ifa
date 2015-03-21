Array.prototype.unique = function()
{
  var n = {},r=[];
  for(var i = 0; i < this.length; i++) 
  {
    if (!n[this[i]]) 
    {
      n[this[i]] = true; 
      r.push(this[i]); 
    }
  }
  return r;
}

$(document).ready(function(){

  L.mapbox.accessToken = 'pk.eyJ1Ijoic3NtIiwiYSI6IkFsRTJFNDAifQ.k7_1MScHyFU44SbXlC3x8w';
  var map = L.mapbox.map('map', 'ssm.ld63nlnh')
    .setView([0,0], 2);

  var svg = d3.select(map.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");
  var colors = ["#a6cee3",
    "#1f78b4",
    "#b2df8a",
    "#33a02c",
    "#fb9a99",
    "#e31a1c",
    "#fdbf6f",
    "#ff7f00",
    "#cab2d6",
    "#6a3d9a",
    "#ffff99"];


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
          category: d.Category ? d.Category : "Miscellaneous",
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
      var categories = alumni.map(function(a){
        return a.category;
      });
      categories = categories.unique();

      var names = alumni.map(function(a){
        return a.name;
      });

      $( "#searchbox" ).autocomplete({
        source: names,
        select: function(e, ui){
          var i = names.indexOf(ui.item.value);
          var d = alumni[i];
          $("#info").html(
            "<h2 class=\"name\">" + d.name + "</h2>" +
            "<div class=\"degree\">" + d.degree + "</div>" +
            "<div class=\"notes\">" + d.notes + "</div>" +
            "<div class=\"place\">" + d.place + "</div>"
          );
        }
      });

      loadAlumni(err, categories, alumni);
    });

  function loadAlumni(err, categories, alumni) {

    var alumniDom = alumni;
    var filterSet = categories;
    var tip = tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d.name; });


    //first render
    renderMap();
    renderCat();
    renderMeta();

    map.on("viewreset", renderMap);

    $('.category-box').click(function(){
      $(this).toggleClass('selected');
      filterSet = [];
      $('.selected').each(function(){
        filterSet.push(this.textContent);
      });

      alumniDom = alumni.filter(function(e){
        if(filterSet.indexOf(e.category) != -1)
          return true;
        else
          return false;
      });

      renderMap();
      renderMeta();
    });

    //renders map and points
    function renderMap(){

      alumniDom = alumniDom.map(function(d) {
        d.lat = isNaN(d.lat) ? 0 : d.lat;
        d.lon = isNaN(d.lon) ? 0 : d.lon;

        var p = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon));
        d.x = p.x;
        d.y = p.y;

        return d;
      });

      var lats = alumniDom.map(function(d){
        return d.x;
      });
      var lons = alumniDom.map(function(d){
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

      g.call(tip);
      tip.direction("e");
      tip.offset([-40,10]);

      g.selectAll("circle.point")
        .data(alumniDom)
        .enter()
        .append("circle")
        .attr("r",4)
        .attr("class", "point")
        .attr("fill", function(d){
          var col = '#000000';
          categories.forEach(function(c, i){
            if(c.indexOf(d.category) != -1)
              col = colors[i];
          });
          return col;
        })
        .attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        })
        .on("click", function(d){
          $("#info").html(
            "<h2 class=\"name\">" + d.name + "</h2>" +
            "<div class=\"degree\">" + d.degree + "</div>" +
            "<div class=\"notes\">" + d.notes + "</div>" +
            "<div class=\"place\">" + d.place + "</div>"
          );
        })
        .on("mouseover", function(d){
          d3.select(this).attr("r", 10);
          tip.show(d);
        })
        .on("mouseout", function(d){
          d3.select(this).attr("r", 4);
          tip.hide(d);
        });

      g.selectAll("circle.point")
        .data(alumniDom) 
        .attr("fill", function(d){
          categories.forEach(function(c, i){
            if(c.indexOf(d.category) != -1)
              col = colors[i];
          });
          return col;
        })
        .attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        })
        .style("opacity", function(d){
          return d.lat || d.lon;
        });

      g.selectAll("circle.point")
        .data(alumniDom)
        .exit().transition().remove();

    }

    //renders categories
    function renderCat(){
      d3.select("#categories-viz")
        .selectAll("div")
        .data(categories)
        .enter()
        .append("div")
        .attr("class", function(d){
          return "category-box selected";
        })
        .attr("style", function(d, i){
          return "border-left: " + colors[i] + " solid 4px;"; 
        })
        .text(function(d){
          return d;
        });
    }

    function renderMeta(){

      var meta = [{
        alumniCount: alumniDom.length,
        selectedCategories: filterSet.length
      }];

      $("#meta-viz #total").remove();

      d3.select("#meta-viz")
        .selectAll("div")
        .data(meta)
        .enter()
        .append("div")
        .attr("id", "total")
        .text(function(d){
          return "Displaying " + d.alumniCount + " alumnis from " + d.selectedCategories + " selected categories.";
        });
    }

  }

  // function loadWorld(err, world) {
  //   svg.insert("path", ".graticule")
  //     .datum(topojson.feature(world, world.objects.land))
  //     .attr("class", "land")
  //     .attr("d", path);

  //   svg.insert("path", ".graticule")
  //     .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
  //     .attr("class", "boundary")
  //     .attr("d", path);
  // }

  // d3.select(self.frameElement).style("height", height + "px");


});