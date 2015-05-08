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


  var ifaloc = {};
  ifaloc.lat = 40.776251;
  ifaloc.lon = -73.963786;

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
          img_url: d.ImageURL ? d.ImageURL : "profile-icon.png" ,
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
        a.category = a.category.toLowerCase();
        return a.category;
      });

      var catfreq = {};

      alumni.forEach(function(a){
        if(!catfreq[a.category])
          catfreq[a.category]=1;
        else
          catfreq[a.category]++;

      });


      var donutData = [];

      Object.keys(catfreq).forEach(function(k){
        if(k !== "miscellaneous")
          donutData.push({
            name: k,
            count: catfreq[k]
          });
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
          $("#alumni-info").html(
            "<div class=\"large-6 columns\">" +
              "<img src=\"profile_images/" + d.img_url + "\"></img>" + 
            "</div>" +
            "<div class=\"large-6 columns\">" +
              "<h2 class=\"name\">" + d.name + "</h2>" +
              "<div class=\"degree\">" + (d.degree? d.degree : "") + "</div>" +
              "<div class=\"notes\">" + (d.notes? d.notes : "") + "</div>" +
              "<div class=\"place\">" + (d.place? d.place : "") + "</div>" +
            "</div>"
          );
        }
      });

      loadAlumni(err, categories, alumni, donutData);
    });

  function loadAlumni(err, categories, alumni, donutData) {

    var alumniDom = alumni;
    var filterSet = categories;
    var tip = tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d.name; });
    var linesData = [];
    var lines = g.insert("g")
      .attr("class", "lines");

    alumniDom.forEach(function(a){
      if(!isNaN(a.lat) && a.lat!==470)
        linesData.push({
          fx: a.lat,
          fy: a.lon,
          tx: ifaloc.lat,
          ty: ifaloc.lon
        });
    });

    //first render
    renderMap();
    renderCat();
    renderMeta();
    renderBarChart(donutData);


    map.on("viewreset", renderMap);

    $('.category-box').click(function(){
      $(this).toggleClass('selected');
      filterSet = [];
      $('.selected').each(function(){
        filterSet.push(this.textContent);
      });

      alumniDom = alumni.filter(function(e){
        return (filterSet.indexOf(e.category) != -1);
      });

      renderMeta();
      renderBarChart(donutData);
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

      linesData = linesData.map(function(d){

        var f = map.latLngToLayerPoint(new L.LatLng(d.fx, d.fy));
        var t = map.latLngToLayerPoint(new L.LatLng(d.tx, d.ty));

        d.from_x = f.x;
        d.from_y = f.y;
        d.to_x = t.x;
        d.to_y = t.y;

        return d;

      });
      console.log(linesData.length);


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
      // lines.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

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
          $("#alumni-info").html(
            "<div class=\"large-6 columns\">" +
              "<img src=\"profile_images/" + d.img_url + "\"></img>" + 
            "</div>" +
            "<div class=\"large-6 columns\">" +
              "<h2 class=\"name\">" + d.name + "</h2>" +
              "<div class=\"degree\">" + (d.degree? d.degree : "") + "</div>" +
              "<div class=\"notes\">" + (d.notes? d.notes : "") + "</div>" +
              "<div class=\"place\">" + (d.place? d.place : "") + "</div>" +
            "</div>"
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
            if(c.indexOf(d.category.toLowerCase()) != -1)
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


      lines.selectAll("line")
        .data(linesData)
        .enter()
        .append("line")
        .attr("class", "connect")
        .style("stroke", "rgba(0,0,0,1)")
        .attr("x1", function(d){ return d.from_x; })
        .attr("y1", function(d){ return d.from_y; })
        .attr("x2", function(d){ return d.to_x; })
        .attr("y2", function(d){ return d.to_y; });

      lines.selectAll("line")
        .data(linesData)
        .attr("x1", function(d){ return d.from_x; })
        .attr("y1", function(d){ return d.from_y; })
        .attr("x2", function(d){ return d.to_x; })
        .attr("y2", function(d){ return d.to_y; });

      lines.selectAll("line")
        .data(linesData)
        .exit()
        .transition().remove();

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
          return "border-left-width: 3px; border-left-style: solid; border-color: " + colors[i] + ";"; 
        })
        .append("span")
        .attr("class", "text-inlay")
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
        // .append("div")
        // .attr("id", "meta-viz")
        .append("div")
        .attr("id", "total")
        .text(function(d){
          return "Displaying " + d.alumniCount + " alumnis from " + d.selectedCategories + " selected categories.";
        });
    }


    function renderBarChart(donutData){
      var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 300 - margin.left - margin.right,
        height = 150 - margin.top - margin.bottom;

      var x = d3.scale.ordinal()
          .rangeRoundBands([0, width], .1);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left")
          .ticks(10, "%");

      var svg = d3.select("#bargraph").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        x.domain(donutData.map(function(d) { return d.name; }));
        y.domain([0, d3.max(donutData, function(d) { return d.count; })]);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Frequency");

        svg.selectAll(".bar")
            .data(donutData)
          .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d.name); })
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d.count); })
            .attr("height", function(d) { return height - y(d.count); });

    }


    function renderLine(linesData){
      console.log(linesData);
      g.selectAll("line")
        .data(linesData)
        .append("line")
        .attr("class", "lines")
        .attr("x1", function(d){ return d.from_x; })
        .attr("y1", function(d){ return d.from_y; })
        .attr("x2", function(d){ return d.to_x; })
        .attr("y2", function(d){ return d.to_y; });
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