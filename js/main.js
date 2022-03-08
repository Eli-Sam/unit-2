//Here we declare map variable globally so all functions have access
var map;
var minValue;
var dataStats = {};

//Create map function
function createMap(){

  //Create the map
  map = L.map('map', {
    center: [20, -67],
    zoom: 4
  });

  //Add OSM base tilelayer in this case watercolor
  L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abcd',
    minZoom: 1,
    maxZoom: 16,
    ext: 'jpg'
  }).addTo(map);

  //Call getData function
  getData(map);
};

//Min Value function
function calculateMinValue(data){
    //Create empty array to store all data values
    var allValues = [];
    //Loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 2000; year <= 2020; year+=1){
              //Get population for current year
              var value = city.properties["Tour_"+ String(year)];
              //Add value to array if they exist
              if (value){
                allValues.push(value)
              }
        }
    }
    //Get minimum value of our array
    var minValue = Math.min(...allValues)
    //Return that minumum
    return minValue;
}

//Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //Constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 0.40 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
};

//Import GeoJSON data
function getData(map){
       //Load the data
       fetch("data/touristnumbers.geojson")
           .then(function(response){
               return response.json();
           })
           .then(function(json){
                //Create an attributes array and call other functions
               calcStats(json);
               var attributes = processData(json);
               minValue = calculateMinValue(json);
               createPropSymbols(json, attributes);
               createSequenceControls(attributes);
               createLegend(attributes);
           })
   };

function processData(data){
    //Empty array to hold attributes
    var attributes = [];

    //Properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //Push each attribute name into attributes array
    for (var attribute in properties){
        //Only take attributes with Tourist values
        if (attribute.indexOf("Tour") > -1){
            attributes.push(attribute);
        };
    };

    //Check result
    console.log(attributes);

    return attributes;
};
//Function to create popupContent
function PopupContent(properties, attribute){
  //Using object oriented programming to create different parts of the popup
  this.properties = properties;
  this.attribute = attribute;
  this.year = attribute.split("_")[1];
  this.population = this.properties[attribute];
  //Creates the format for the popup
  this.formatted = "<p><b>Country:</b> " + this.properties["Country Name"] + "</p><p><b>Number of Tourists arrivals in  " + this.year + ":</b> " + this.population;
};


//Function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //Check in console
    console.log(attribute);

    //Create marker options
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

    //Create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //Build popup content string
    var popupContent = new PopupContent(feature.properties, attribute);
    //Bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
        offset: new L.Point(0,-options.radius)
    });

    //Return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature){
          //Access feature properties
          var props = layer.feature.properties;
          //Get year value of the current prop symbol
          var year = attribute.split("_")[1];
          //Update temporal legend
          document.querySelector("span.year").innerHTML = year;
          //Update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          //Updated popup function call
          var popupContent = new PopupContent(props, attribute);

          //Update popup with new content
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

//Create new sequence controls
function createSequenceControls(attributes){
    //Create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //Input listener for slider
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
      //Create the control container div with a particular class name
      var container = L.DomUtil.create('div', 'sequence-control-container');
      //Initialize other elements such as the buttons
      container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
      container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/nounrewind.png"></button>');
      container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/nounforward.png"></button>');
      //Disable any mouse event listeners for the container
      L.DomEvent.disableClickPropagation(container);
      return container;
    }

  });

  map.addControl(new SequenceControl());
  document.querySelectorAll('.step').forEach(function(step){
    //Sets information about how the slider steps
    document.querySelector(".range-slider").max = 20;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    //Add listeners after adding control
    step.addEventListener("click", function(){
      var index = document.querySelector('.range-slider').value;

      //Increment or decrement depending on button clicked
      if (step.id == 'forward'){
        index++;
        //If past the last attribute, wrap around to first attribute
        index = index > 20 ? 0 : index;
      } else if (step.id == 'reverse'){
        index--;
        //If past the first attribute, wrap around to last attribute
        index = index < 0 ? 20 : index;
      };

      //Update slider
      document.querySelector('.range-slider').value = index;
      updatePropSymbols(attributes[index])
    })
    document.querySelector('.range-slider').addEventListener('input', function(){
      //Indexes the value so when moving the slider input the value changes
      var index = this.value;
      console.log(index)
      //Update slider
      updatePropSymbols(attributes[index]);
    })
  })
};


function calcStats(data){
  //Create empty array to store all data values
  var allValues = [];
  //Loop through each city
  for(var country of data.features){
    //loop through each year
    for(var year = 2000; year <= 2020; year+=1){
      //Get population for current year
      var value = country.properties["Tour_"+ String(year)];
      //Add value to array
      if (value){
        allValues.push(value);
      }
    }
  }
  //Get min, max, mean stats for our array
  dataStats.min = Math.min(...allValues);
  dataStats.max = Math.max(...allValues);
  //Calculate meanValue
  var sum = allValues.reduce(function(a, b){return a+b;});
  dataStats.mean = sum/ allValues.length;

};
//Function to create the legend
function createLegend(attributes){
  var LegendControl = L.Control.extend({
    options: {
      position: 'bottomright',
    },

    onAdd: function () {
      // Create the control container with a particular class name
      var container = L.DomUtil.create('div', 'legend-control-container');
      //Text for container header
      container.innerHTML = '<p class="temporalLegend">Tourist Arrivals in <span class="year"> 2000 </span></p>';

      //Start attribute legend svg string
      var svg = '<svg id="attribute-legend" width="350px" height="200px">';

      //Array of circle names to base loop on
      var circles = ["max", "mean", "min"];

      //Loop to add each circle and text to svg string
      for (var i=0; i<circles.length; i++){

        //Assign the r and cy attributes
        var radius = calcPropRadius(dataStats[circles[i]]*2);
        var cy = 130 - radius;

        //Circle string
        svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="65"/>';
        var textY = i * 21 + 85;

        //Text string
        svg += '<text id="' + circles[i] + '-text" x="110" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + " Tourists" + '</text>';
      };


      //Close svg string
      svg += "</svg>"; ;

      //Add attribute legend svg to container
      container.innerHTML += svg;
      return container;
    }
  });

  map.addControl(new LegendControl());
};

document.addEventListener('DOMContentLoaded',createMap)
