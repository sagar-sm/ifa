/* ---------------------------------------------
IFA Alumni Visualization
------------------------------------------------

Authors:                    Sagar Mohite, Jason Varone
Github:                     https://github.com/sagar-sm/ifa/
Developement Version:       https://sagar-sm.github.io/ifa/mapping-alumni/
Live Version:               http://www.nyu.edu/gsas/dept/fineart/mapping-alumni/

------------------------------------------------*/

//MISC FUNCTIONALITIES
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

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

/*-----------------------------------------------*/

//READY
$(document).ready(function(){

  //SETUP MAPBOX
  L.mapbox.accessToken = 'pk.eyJ1Ijoic3NtIiwiYSI6IkFsRTJFNDAifQ.k7_1MScHyFU44SbXlC3x8w';
  var map = L.mapbox.map('map', 'ssm.m5hkonen')
    .setView([35,-50], 3);


  //STATE VARIABLES AND CONSTANTS
  var panelOpen = false; //alumni info panel state
  var marker; //blue pin marker to be displayed upon alumni select
  var placeCount = {}; //hashtable for count of alumni in workplaces
  var radius = 4;
  var padding = 1;
  var alumniDom;

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
    "#ececec"];


  var ifaloc = {}; //location of NYU IFA
  ifaloc.lat = 40.776251;
  ifaloc.lon = -73.963786;



  //SETUP SVG PANE
  var svg = d3.select(map.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  //SETUP BAR CHART VARIABLES. Variables with a `b` prepended are usually related to the bar chart
  var bmargin = {top: 0, right: 0, bottom: 0, left: 0},
    bwidth = 300 - bmargin.left - bmargin.right,
    bheight = 150 - bmargin.top - bmargin.bottom;

  var bx = d3.scale.ordinal()
      .rangeRoundBands([0, bwidth], .1);

  var by = d3.scale.linear()
      .range([bheight, 0]);

  var bxAxis = d3.svg.axis()
      .scale(bx)
      .orient("bottom");

  var byAxis = d3.svg.axis()
      .scale(by)
      .orient("left")
      .ticks(10, "%");

  var bar = d3.select("#bargraph").append("svg")
      .attr("width", bwidth + bmargin.left + bmargin.right)
      .attr("height", bheight + bmargin.top + bmargin.bottom)
    .append("g")
      .attr("transform", "translate(" + bmargin.left + "," + bmargin.top + ")");


  //LOAD DATA ASYNCHRONOUSLY
  queue()
    .defer(function(url, callback){
      d3.csv(url, function(d){
        return {
          category: d.Category ? d.Category : "other occupations",
          name: d.Name,
          img_url: d.ImageURL ? d.ImageURL : "profile-icon.png" ,
          aptDate: new Date(+d.AppointmentDate, 0, 1),
          lat: +d.La,
          lon: +d.Lo,
          place: d.Workplace,
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

      var barData = [];

      Object.keys(catfreq).forEach(function(k){
        if(k !== "other occupations")
          barData.push({
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
          renderPanel(d, true); //direct option is set to true to bypass all alumni
        }
      });

      loadAlumni(err, categories, alumni, barData);
    });

  function loadAlumni(err, categories, alumni, _barData) {

    alumniDom = alumni;
    var filterSet = categories;
    var tip  = d3.tip().attr('class', 'd3-tip').html(function(d) { 
      if(placeCount[d.place] > 1)
        return d.place;
      else
        return d.name; 
    });
    var btip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d.name.capitalizeFirstLetter() + ": " + d.count; });
    var linesData = [];
    var lines = g.insert("g")
      .attr("class", "lines");

    alumniDom.forEach(function(a){
      if(!isNaN(a.lat) && a.lat!==0)
        linesData.push({
          fx: a.lat,
          fy: a.lon,
          tx: ifaloc.lat,
          ty: ifaloc.lon
        });
    });

    var barData = _barData;

    //first render
    renderMap();      //map and points on it
    renderCat();      //categories checkboxes
    // renderMeta();     //meta data
    renderBarChart(); //bar chart

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

      barData = _barData.filter(function(e){
        return (filterSet.indexOf(e.name) != -1)
      });

      linesData = [];

      alumniDom.forEach(function(a){
        if(!isNaN(a.lat) && a.lat!==0)
          linesData.push({
            fx: a.lat,
            fy: a.lon,
            tx: ifaloc.lat,
            ty: ifaloc.lon
          });
      });

      renderMap();
      // renderMeta();
      renderBarChart();
    });

    //RENDERS MAP, LINES AND POINTS
    function renderMap(){

      alumniDom = alumniDom.map(function(d) {
        d.lat = isNaN(d.lat) ? 0 : d.lat;
        d.lon = isNaN(d.lon) ? 0 : d.lon;

        var p = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon));

        d.x = p.x;
        d.y = p.y;

        return d;
      }).filter(function(e){
        if(!(e.lat === 0 && e.lon == 0))
          return e;
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
        .attr("r", radius)
        .attr("class", "point")
        .attr("fill", function(d){
          var col = '#dddddd';
          categories.forEach(function(c, i){
            if(c.indexOf(d.category) != -1)
              col = colors[i];
          });
          return col;
        })
        .attr("cx", function(d){
          if(!placeCount[d.place]) {
            placeCount[d.place] = 1;
          }
          else {
            placeCount[d.place]++;
          }
          return d.x;
        })
        .attr("cy", function(d){
          return d.y;
        })
        .on("click", function(d){
          renderPanel(d);
        })
        .on("mouseover", function(d){
          d3.select(this).attr("r", 10);
          tip.show(d);
        })
        .on("mouseout", function(d){
          d3.select(this).attr("r", 4);
          tip.hide(d);
        });

        console.log(placeCount);
      g.selectAll("circle.point")
        .data(alumniDom) 
        .attr("fill", function(d){
          categories.forEach(function(c, i){
            if(c.indexOf(d.category.toLowerCase()) != -1)
              col = colors[i];
          });
          return col;
        })
        .attr("r", radius)
        .attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        });

      g.selectAll("circle.point")
        .data(alumniDom)
        .exit().transition().remove();


      lines.selectAll("line")
        .data(linesData)
        .enter()
        .append("line")
        .attr("class", "connect")
        .style("stroke", "rgba(0,0,0,0.15)")
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

    //RENDERS CATEGORY CHECKBOXES
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


    //TO RENDER TOTAL ALUMNI CURRENTLY ON MAP
    //Legacy. this function is no longer used.
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
        .attr("id", "meta-viz")
        .append("div")
        .attr("id", "total")
        
    }
        
    //RENDER BAR CHART
    function renderBarChart(){

        bx.domain(barData.map(function(d) { return d.name; }));
        by.domain([0, d3.max(barData, function(d) { return d.count; })]);

        bar.call(btip);
        btip.direction("e");
        btip.offset([-40,10]);

        bar.selectAll(".bar")
            .data(barData)
          .enter().append("rect")
            .attr("class", "bar")
            .on("mouseover", function(d){
              btip.show(d);
            })
            .on("mouseout", function(d){
              btip.hide(d);
            })
            .transition().duration(200)
            .attr("fill", function(d) { 
              var col = '#ffffff';
              var i = categories.indexOf(d.name);
              if(i != -1)
                col = colors[i];
              return col;
            })
            .attr("x", function(d) { return bx(d.name); })
            .attr("width", bx.rangeBand())
            .attr("y", function(d) { return by(d.count); })
            .attr("height", function(d) { return bheight - by(d.count); });

        bar.selectAll(".bar")
            .data(barData)
            .attr("class", "bar")
            .attr("fill", function(d) { 
              var col = '#ffffff';
              var i = categories.indexOf(d.name);
              if(i != -1)
                col = colors[i];
              return col;
            })
            .transition().duration(200)
            .attr("x", function(d) { return bx(d.name); })
            .attr("width", bx.rangeBand())
            .attr("y", function(d) { return by(d.count); })
            .attr("height", function(d) { return bheight - by(d.count); });

        bar.selectAll(".bar")
          .data(barData)
          .exit()
          .transition().remove(); 

    }

  }

  //RENDER INFO PANEL
  /*
    `d` is the object to be rendered
    `direct` is a boolean option for bypassing initial placeCount check
  */
  function renderPanel(d, direct){
    if( placeCount[d.place] > 1 && !direct){
      $("#alumni-info").html(
        "<div class=\"small-12 columns\">" +
        "<h2 class=\"cumul\">" + placeCount[d.place] + " alumni who work at " + d.place + "</h2>" +
        // "<p class=\"subheader\">Select to view details</p>" +
        "<i class=\"fi-x\"></i>" + 
        "</div>"
      );
      var list_col1 = $("<div class=\"cumul small-4 columns\"></div>");
      var list_col2 = $("<div class=\"cumul small-4 columns\"></div>");
      var list_col3 = $("<div class=\"cumul small-4 columns\"></div>");
      var cumul = alumniDom.filter(function(e){
        return (e.place === d.place);
      });

      for (var i = 0; i < cumul.length; i+=3) {
        list_col1.append("<div class=\"alum-href\">" + cumul[i].name + "</div>");
        if(i < cumul.length - 1)
          list_col2.append("<div class=\"alum-href\">" + cumul[i+1].name + "</div>");
        if(i < cumul.length - 2)
          list_col3.append("<div class=\"alum-href\">" + cumul[i+2].name + "</div>");
      };

      $("#alumni-info").append(list_col1);
      $("#alumni-info").append(list_col2);
      $("#alumni-info").append(list_col3);

    }
    else{
      renderAlumProfile(d);
    }

    if( !panelOpen ){
      $("#alumni-info").fadeThenSlideToggle();
      panelOpen = true;
    }

    //refresh marker
    if(marker)
      map.removeLayer(marker);

    if(d.lat != 0 && d.lon !=0)
      map.setView([d.lat, d.lon], 15);
    else
      map.setView([35,-50], 3);
    
    marker = L.marker([d.lat, d.lon]);
    map.addLayer(marker);
  }

  //UPON ALUMNI NAME CLICK SHOW PROFILE PANEL
  $(document).on("click", ".alum-href", function(e){
    console.log(e.target.innerHTML);
    var d = alumniDom.filter(function(a){ return a.name === e.target.innerHTML; })[0];
    renderAlumProfile(d);
  });

  //RENDERS PROFILE PANEL
  function renderAlumProfile(d){
    $("#alumni-info").html(
      "<div id=\"profile_img\" class=\"small-3 columns\">" +
        "<img src=\"profile_images/" + d.img_url + "\"></img>" + 
      "</div>" +
      "<div class=\"small-9 columns\">" +
        "<h2 class=\"name\">" + d.name + "</h2>" +
        "<i class=\"fi-x\"></i>" + 
        "<div class=\"degree\">" + (d.degree? d.degree : "") + "</div>" +
        "<div class=\"notes\">" + (d.notes? d.notes : "") + "</div>" +
        "<div class=\"place\">" + (d.place? d.place : "") + "</div>" +
      "</div>"
    );
  }

  //CLOSE PANEL
  $(document).on("click", ".fi-x", function(){
    $("#alumni-info").fadeThenSlideToggle();
    panelOpen = false;
    if(marker)
      map.removeLayer(marker);
  });

  //ANIMATE PANEL ENTRY/EXIT
  jQuery.fn.fadeThenSlideToggle = function(speed, easing, callback) {
    if (this.is(":hidden")) {
      return this.slideDown(speed, easing).fadeTo(speed, 1, easing, callback);
    } else {
      return this.fadeTo(speed, 0, easing).slideUp(speed, easing, callback);
    }
  };

});