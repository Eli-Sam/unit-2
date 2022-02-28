//declare map variable globally so all functions have access
var map;
var minValue;

//step 1 create map
function createMap(){

    //create the map
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
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
    if(attValue){
      var radius = 0.05 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
  }
  // ATTEMPTING TO CHANGE THE SYMBOLS WHEN RADIUS IS EMPTY
    else{
      var radius="None"
      return radius;
    }
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
    var popupContent = "<p><b>Country:</b> " + feature.properties["Country Name"] + "</p>";

  //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Number of Tourists in " + year + ":</b> " + feature.properties[attribute];
    //bind the popup to the circle marker
    layer.bindPopup(popupContent);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          if (radius!='None'){
            layer.setRadius(radius);
          }
          // ATTEMPTING TO CHANGE THE SYMBOLS WHEN RADIUS IS EMPTY
          else{
            var layer = L.marker(latlng).addTo(map);
          }

          //add city to popup content string
          var popupContent = "<p><b>Country:</b> " + props["Country Name"] + "</p>";

          //add formatted attribute to panel content string
          var year = attribute.split("_")[1];
          popupContent += "<p><b>Number of Tourists in " + year + ":</b> " + props[attribute] ;

          //update popup content
          popup = layer.getPopup();
          popup.setContent(popupContent).update();
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

  //set slider attributes
    document.querySelector(".range-slider").max = 20;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/nounrewind.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/nounforward.png'>")

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

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
      var index = this.value;
      updatePropSymbols(attributes[index])
      console.log(index)
    });
};


document.addEventListener('DOMContentLoaded',createMap)
