//declare map variable globally so all functions have access
var map;
var minValue;
var dataStats = {};

//step 1 create map
function createMap(){

    //create the map
    map = L.map('map', {
        center: [20, -67],
        zoom: 4
    });

    //add OSM base tilelayer
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      minZoom: 1,
      maxZoom: 16,
      ext: 'jpg'
    }).addTo(map);

    //call getData function
    getData(map);
};

function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 2000; year <= 2020; year+=1){
              //get population for current year
              var value = city.properties["Tour_"+ String(year)];
              //add value to array
              if (value){
                allValues.push(value)
              }
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 0.40 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
};

//Step 2: Import GeoJSON data
function getData(map){
       //load the data
       fetch("data/touristnumbers.geojson")
           .then(function(response){
               return response.json();
           })
           .then(function(json){
                //create an attributes array
               var attributes = processData(json);
               minValue = calculateMinValue(json);
               createPropSymbols(json, attributes);
               createSequenceControls(attributes);
               createLegend(attributes);
               calcStats(json);
           })
   };

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Tour") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.split("_")[1];
    this.population = this.properties[attribute];
    this.formatted = "<p><b>Country:</b> " + this.properties["Country Name"] + "</p><p><b>Number of Tourists arrivals in  " + this.year + ":</b> " + this.population;
};


//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    //build popup content string starting with city...Example 2.1 line 24
    var popupContent = new PopupContent(feature.properties, attribute);
    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
        offset: new L.Point(0,-options.radius)
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          //Example 1.3 line 6...in UpdatePropSymbols()
          var popupContent = new PopupContent(props, attribute);

          //update popup with new content
          popup = layer.getPopup();
          popup.setContent(popupContent.formatted).update();
        };
    });
};

//Add circle markers for point features to the map
function createPropSymbols(data,attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
      pointToLayer: function(feature, latlng){
          return pointToLayer(feature, latlng,attributes);
           }
    }).addTo(map);
};

//Step 1: Create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);



    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
      var index = this.value;
      updatePropSymbols(attributes[index])
      console.log(index)
    });
};

//Create new sequence controls
function createSequenceControls(attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // ... initialize other DOM elements
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/nounrewind.png"></button>');
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/nounforward.png"></button>');
            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);
            return container;
        }

    });

    map.addControl(new SequenceControl());    // add listeners after adding control
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
          var index = document.querySelector('.range-slider').value;

          //Step 6: increment or decrement depending on button clicked
          if (step.id == 'forward'){
              index++;
              //Step 7: if past the last attribute, wrap around to first attribute
              index = index > 20 ? 0 : index;
          } else if (step.id == 'reverse'){
              index--;
              //Step 7: if past the first attribute, wrap around to last attribute
              index = index < 0 ? 20 : index;
          };

          //Step 8: update slider
          document.querySelector('.range-slider').value = index;
          updatePropSymbols(attributes[index])
      })
  })
  };


  function calcStats(data){
      //create empty array to store all data values
      var allValues = [];
      //loop through each city
      for(var country of data.features){
          //loop through each year
          for(var year = 2000; year <= 2020; year+=1){
                //get population for current year
                var value = country.properties["Tour_"+ String(year)];
                //add value to array
                if (value){
                  allValues.push(value);
              }
          }
      }
      //get min, max, mean stats for our array
      dataStats.min = Math.min(...allValues);
      dataStats.max = Math.max(...allValues);
      //calculate meanValue
      var sum = allValues.reduce(function(a, b){return a+b;});
      dataStats.mean = sum/ allValues.length;

  }

function createLegend(attributes){
      var LegendControl = L.Control.extend({
          options: {
              position: 'bottomright'
          },

          onAdd: function () {
              // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

           container.innerHTML = '<p class="temporalLegend">Tourist Arrivals in <span class="year">2000</span></p>';

           //Step 1: start attribute legend svg string
           var svg = '<svg id="attribute-legend" width="130px" height="130px">';

        //array of circle names to base loop on
        var circles = ["max", "mean", "min"];

        //Step 2: loop to add each circle and text to svg string
        for (var i=0; i<circles.length; i++){

        //Step 3: assign the r and cy attributes
        var radius = calcPropRadius(dataStats[circles[i]]);
        var cy = 130 - radius;

            //circle string
            svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="65"/>';
        };

        //close svg string
        svg += "</svg>"; ;

          //add attribute legend svg to container
          container.insertAdjacentHTML('beforeend',svg);

           //add attribute legend svg to container
           container.innerHTML += svg;
              return container;
          }
      });

      map.addControl(new LegendControl());
  };

document.addEventListener('DOMContentLoaded',createMap)
