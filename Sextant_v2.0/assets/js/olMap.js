/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (C) 2012 Pyravlos Team
 *
 * http://www.sextant.di.uoa.gr/
 */

/**
 *  OpenLayers map
 */
var map;

/**
 * Shared control among layers for selecting features
 */
var control, mouseControl, infoWMS = [];

/**
 * Table with the info of all layers
 */
var mapLayers = [];


/**
 * Variable that controls the fadeout time of messages in tha application (in msecs)
 */
var fadeTime = 5000;
var fadeTimeFast = 1000;

/**
 * Ajax calls timeout set to 5 min
 */
var ajaxTimeout = 300000;

/**
 * Disable or enable sextant features. Set to true to disable all OK buttons,
 * so that users cannot alter existing layers in a server distribution.
 */
disableAll = false;

/**
 * Disable or enable sextant save map feature. Set to true to disable save map functionality,
 * so that users cannot alter existing maps in the registry.
 */
disableSaveMap = false;

/**
 * URL of the mobile server
 */
var myHost = window.location.href;
var arrHost = myHost.replace("http://", "").split("/");
var rootURL = 'http://' + arrHost[0] + '/' + arrHost[1] +'/rest/service';
var parseRootURL = arrHost[0].split(':');
var server = parseRootURL[0];

var colorSpin = '#E8EFF5';
var colorSpinDescribe = '#7E7E7E';

/**
 * The two base layers for the map
 */
var bingMapsKey = null;
var bingMap = null;
var bingAerialLabels = null;
var bingRoads = null;

var baseOSM = new ol.layer.Tile({
    preload: Infinity,
    source: new ol.source.OSM()
});


/**
 * Default style for vector layers
 */
var defaultVectorStyle = new ol.style.Style({
	stroke: new ol.style.Stroke({
        color: [255, 153, 0, 1],
        width: 1
    }),
    fill: new ol.style.Fill({
        color: [255, 153, 0, 0.4]
    }),/*
    image: new ol.style.Icon({
    	src: "./assets/images/map-pin-md.png",
    	scale: 0.1,
    	crossOrigin: 'anonymous'
    })*/
	image: new ol.style.Circle({
	    fill: new ol.style.Fill({
	      color: [255, 153, 0, 0.4]
	    }),
	    radius: 5,
	    stroke: new ol.style.Stroke({
	      color: [255, 153, 0, 1],
	      width: 1
	    })
	})
});

/*
 * var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(({
          anchor: [0.5, 46],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          src: 'data/icon.png'
        }))
      });
 */

/**
 * Style features when we click them on the map
 */
var clickFeatureStyle = new ol.style.Style({
	stroke: new ol.style.Stroke({
        color: [0, 0, 255, 1],
        width: 1
    }),
    fill: new ol.style.Fill({
        color: [0, 0, 255, 0.4]
    }),
    image: new ol.style.Circle({
	    fill: new ol.style.Fill({
	      color: [0, 0, 255, 0.4]
	    }),
	    radius: 5,
	    stroke: new ol.style.Stroke({
	      color: [0, 0, 255, 1],
	      width: 1
	    })
	})
});

var featureOverlay = new ol.layer.Image({
	title: 'overlayStyle',
    source: new ol.source.ImageVector({
      source: new ol.source.Vector(),
      style: clickFeatureStyle
    })
});

/**
 * OL interaction when we select a feature on the map
 */
var mapSelectInterraction = new ol.interaction.Select({style: clickFeatureStyle});

/**
 * Popups
 */
var container, content, closer, overlay;

/**
 * Map center on load
 */
var center = ol.proj.transform([11.0, 55.0], 'EPSG:4326', 'EPSG:3857');

function getBingKey() {
	$.ajax({
        type: 'GET',
        url: rootURL + '/bingKey',
        headers: {
        	//'Accept-Charset' : 'utf-8',
        	'Content-Type'   : 'text/plain; charset=utf-8',
        },
        timeout: ajaxTimeout,
        success: initMap,
        error: printError
    });
}

function initMap(results, status, jqXHR) {
	if (results == 'none') {
		bingMapsKey = null;
		baseMapType = 'OSM';
	}
	else {
		baseMapType = 'bing';
		bingMapsKey = results.toString();
		bingMap = new ol.layer.Tile({
		    preload: Infinity,
		    source: new ol.source.BingMaps({
		      key: bingMapsKey,
		      imagerySet: 'Aerial',
		    })
		});

		bingAerialLabels = new ol.layer.Tile({
		    preload: Infinity,
		    source: new ol.source.BingMaps({
		      key: bingMapsKey,
		      imagerySet: 'AerialWithLabels',
		    })
		});

		bingRoads = new ol.layer.Tile({
		    preload: Infinity,
		    source: new ol.source.BingMaps({
		      key: bingMapsKey,
		      imagerySet: 'Road',
		    })
		});
	}

	initialize();
	loadMapFromURL();
}

/**
 * Function for initializing the OpenLayers map
 * (called on Window load)
 */
function initialize() {
	loadBingsSearchChangeset();
	loadBingsSearchEvents();
	loadBingsSearchLoadMap();
  drawStations();
  getMethods();
	animateLegendPanel();
	if (!map){
		document.getElementById('tmContainer').style.right = '-3000px';
		document.getElementById('statsContainer').style.right = '-3000px';

		mouseControl = new ol.control.MousePosition({
	        coordinateFormat: ol.coordinate.createStringXY(4),
	        projection: 'EPSG:4326',
	        target: document.getElementById('coordinates'),
	        undefinedHTML: '&nbsp;'
	    });

		var scaleLineControl = new ol.control.ScaleLine();

		//Create popups on map click
		container = document.getElementById('popup');
	    content = document.getElementById('popupTable');
	    closer = document.getElementById('popup-closer');
		overlay = new ol.Overlay(({
	        element: container,
	        autoPan: true,
	        autoPanAnimation: {
	          duration: 250
	        }
	    }));
		closer.onclick = function() {
	        overlay.setPosition(undefined);
	        closer.blur();
	        //mapSelectInterraction.getFeatures().clear();
	        clearOverlayFeatures();
	        return false;
	    };

	    //Drag an drop interaction for vector layers
	    var dragAndDropInteraction = new ol.interaction.DragAndDrop({
	        formatConstructors: [
	          ol.format.KML,
	          ol.format.GeoJSON,
	          ol.format.TopoJSON
	        ]
	    });

		var baseLayers = [];
		if (bingMapsKey != null) {
			baseLayers.push(bingMap);
		}
		else {
			baseLayers.push(baseOSM);
		}

		map = new ol.Map({
	        layers: baseLayers,
	        target: 'map_canvas',
	        renderer: 'webgl',
	        overlays: [overlay],
	        view: new ol.View({
	          projection: 'EPSG:3857',
	          center: center,
	          zoom: 4
	        }),
	        interactions: ol.interaction.defaults().extend([dragAndDropInteraction]),
	        controls: ol.control.defaults().extend([mouseControl, scaleLineControl])
	    });
		map.addLayer(featureOverlay);
		featureOverlay.setZIndex(5);

		map.on('singleclick', function(evt) {
			//Clear selected features
			clearOverlayFeatures();
			content.innerHTML = '';
			document.getElementById('popupButton').innerHTML = '';

	        var coordinate = evt.coordinate;
	        var pixel = evt.pixel;
	        var features = [];

	        map.forEachFeatureAtPixel(pixel, function(feature, layer) {
	          features.push(feature);
	        });

	        //For WMS layers: features.length = 0
	        if (features.length < 1) {
	        	clearPopup();


	        	//Check for WMS layers
	        	var allWMS = [];
	        	for (var i=0; i<mapLayers.length; i++) {
		    		if (mapLayers[i].type.substring(0, 3) == "wms") {
		    			allWMS.push(mapLayers[i].name);
		    		}
		    	}


	        	// Get the WMS layer that is on-top in the zIndex. This is either
	        	// the layer that has the greater value in the zIndex,
	        	// or the last layer in the mapLayers table in case they all
	        	// have the same zIndex value.
	        	var topLayer = null;
	        	var topZIndex = -1;
	        	for (var i=0; i<allWMS.length; i++) {
	        		map.getLayers().forEach(function(layer) {
	                	if (layer.get('title') == allWMS[i]) {
	                		if (layer.getZIndex() >= topZIndex) {
	                			topZIndex = layer.getZIndex();
	                			topLayer = layer.get('title');
	                		}
	                	}
	        		});
	        	}

	        	//Create WMS popup for the top WMS layer
	        	if (topLayer != null) {
					var viewResolution = map.getView().getResolution();

	        		map.getLayers().forEach(function(layer) {
	                	if (layer.get('title') == topLayer) {
	                		var url = layer.getSource().getGetFeatureInfoUrl(
	                				coordinate, viewResolution, 'EPSG:3857',
	    	        	            {'INFO_FORMAT': 'text/html'});

	    	        	    if (url) {
	    	        	    	$.ajax({
		                	        type: 'GET',
		                	        url: url,
		                	        timeout: ajaxTimeout,
		                	        success: parseWMSPopupResults,
		                	        error: printError,
		                	        coordinates: coordinate,
		                	        topLayer: topLayer
		                	    });
	    	        	    }
	                	}
	        		});
	        	}

	        	return;
	        }

	        var overlayFeature = features[0].clone();
	        featureOverlay.getSource().getSource().addFeature(overlayFeature);

	        for (var key in features[0].getProperties()) {
	    		if (key != 'description' && key != 'geometry' && key != 'name' && key != 'objectType') {
	    			content.innerHTML += '<tr><td><b>'+key+'</b></td><td>'+features[0].getProperties()[key]+'</td></tr>';
	    		}
	    		if (key == 'name') {
	    			document.getElementById('popupTitle').innerHTML = features[0].getProperties()[key];
	    		}

		        //Add find changes button to the event detection geometries
	    		if (key == 'objectType' && features[0].getProperties()[key] == 'event') {
	    			var searchTitle = features[0].getProperties()['name'];
	    			var geom = features[0].getGeometry().getExtent();
	    			var extent4326 = ol.proj.transformExtent(geom, 'EPSG:3857', 'EPSG:4326');
	    			geom = mapExtentToWKTLiteralWGS84(extent4326);

	    			var element = document.createElement("button");
	    		    element.type = "button";
	    		    element.innerHTML = 'Find Changes';
	    		    element.setAttribute("class", "btn btn-block btn-md btn-default");
	    		    element.onclick = function () {
	    		    	//CLose popup and clear selected features
	    		        mapSelectInterraction.getFeatures().clear();
	    		        clearPopup();

	    			    var url = '?extent='+encodeURIComponent(geom);
	    			    url = url + '&username='+encodeURIComponent('efaki')+'&password='+encodeURIComponent('testapp');
	    			    url = url + '&polarization=HH';

	    			    /*
	    			    if(typeof(EventSource) !== "undefined") {
	    					var lastMsg = false;
	    				    var source = new EventSource(url);
	    				    source.onmessage = function(event) {
	    				    	if (!lastMsg) {
	    				    		var newElementMsg = document.getElementById('alertMsgChangeset');
	    						    newElementMsg.innerHTML = "<strong>Please wait!</strong> " + event.data;
	    						    document.getElementById('alertMsgChangeset').style.display = 'block';
	    				    	}

	    				    	if (event.data == 'HTTP 401 Unauthorized') {
	    				    		source.close();
	    					    	setTimeout(function() {$('#alertMsgChangeset').fadeOut('slow');}, fadeTime);
	    					    	hideSpinner();
	    					    	hideSpinnerChangeset();
	    				    	}

	    				    	if (event.data == 'No images were found for the specified parameters.') {
	    					    	source.close();
	    						   	setTimeout(function() {$('#alertMsgChangeset').fadeOut('slow');}, fadeTime);
	    						   	hideSpinner();
	    						   	hideSpinnerChangeset();
	    					    }

	    				    	//Check flag to close the SSE
	    					    if (lastMsg) {
	    					    	source.close();
	    					    	setTimeout(function() {$('#alertMsgChangeset').fadeOut('slow');}, fadeTime);
	    					    	hideSpinner();
	    					    	hideSpinnerChangeset();

	    					    	parseChangeset(event.data, searchTitle);
	    					    }

	    					    if (event.data == 'Change detection completed successfully.') {
	    					    	//Next msg is the data
	    					    	lastMsg = true;
	    					    }
	    				    };
	    				}*/
	    			    $.ajax({
	    			        type: 'GET',
	    			        url: rootURL + '/imageAggregator'+url,
	    			        headers: {
	    			        	//'Accept-Charset' : 'utf-8',
	    			        	'Content-Type'   : 'text/plain; charset=utf-8',
	    			        },
	    			        timeout: 0,
	    			        searchTitle: searchTitle,
	    			        success: parseChangeset,
	    			        error: printError
	    			    });
	    		    };

	    		    document.getElementById('popupButton').appendChild(element);
	    		}

		        //Add event detection to the changeset geometries
	    		if (key == 'objectType' && features[0].getProperties()[key] == 'changeset') {
	    			var geom = features[0].getGeometry().getExtent();
	    			console.log(mapExtentToWKTLiteral(geom));
	    			var extent4326 = ol.proj.transformExtent(geom, 'EPSG:3857', 'EPSG:4326');
	    			geom = mapExtentToWKTLiteralWGS84(extent4326);
	    			console.log(geom);

	    			var element = document.createElement("button");
	    		    element.type = "button";
	    		    element.innerHTML = 'Detect Events';
	    		    element.setAttribute("class", "btn btn-block btn-md btn-default");
	    		    element.onclick = function () {
	    		    	//CLose popup and clear selected features
	    		        mapSelectInterraction.getFeatures().clear();
	    		        clearPopup();

	    		        var url = 'http://teleios4.di.uoa.gr:8080/changeDetection/event/search?extent='+encodeURIComponent(geom);
	    		        document.getElementById('alertMsgServerWait').style.display = 'block';
	    				showSpinner(colorSpin);
	    				console.log(url);
	    				$.ajax({
	    				    type: 'GET',
	    				    url: url,
	    				    crossDomain: true,
	    				    timeout: ajaxTimeout,
	    				    success: parseEventDetectionResults,
	    				    error: printError
	    				});
	    		    };

	    		    document.getElementById('popupButton').appendChild(element);
	    		}
	    	}

	        overlay.setPosition(coordinate);

	    });


		dragAndDropInteraction.on('addfeatures', function(event) {
			//console.log(event);
			var layerName = event.file.name.substring(0, event.file.name.lastIndexOf('.'));
			var layerType = event.file.name.substring(event.file.name.lastIndexOf('.')+1, event.file.name.length);

			//Check if the layer name exists
			for (var i=0; i<mapLayers.length; i++) {
	    		if (mapLayers[i].name === layerName) {
	    			//Print error and return
	    			document.getElementById('alertMsgFailNameExists').style.display = 'block';
	    	        setTimeout(function() {$('#alertMsgFailNameExists').fadeOut('slow');}, fadeTime);
	    	        return ;
	    		}
	    	}

			//json file type = topojson
			//geojson file type must be used for geojson files
			if (layerType == 'json') {
				layerType = 'geojson';
			}
			layerType = 'geojson';

			var url = 'dragAndDrop';
		    var tl = new Layer(layerName, url, false, layerType, '', '', '#ff9900', '#ff9900', './assets/images/map-pin-md.png', 20, 0, '', '');
            mapLayers.push(tl);
            //Add a row for this layer in the Manage Layers view
            addTableRow(layerName, layerType);
            //Show renewed last modification date and number of layers
            document.getElementById('infoNumOfLayers').innerHTML = mapLayers.length;

			var vectorSource = new ol.source.Vector({
				features: event.features
		    });
			var layer = new ol.layer.Image({
		    	title: layerName,
		    	source: new ol.source.ImageVector({
		    		source: vectorSource,
		            style: defaultVectorStyle
		        })
		    });
		    map.addLayer(layer);

		    updateLayerStats(layerName);

			for (var i=0; i<mapLayers.length; i++) {
	    		if (mapLayers[i].name === layerName) {
	        		mapLayers[i].features = getLayerFeatureNames(layer);
	            	break;
	    		}
	    	}

			map.getView().fit(layer.getSource().getSource().getExtent(), map.getSize());

			//Create a geojson file using the vector source
			var myFeatures = vectorSource.getFeatures();
			var cloneArray = [];
			for (var i=0; i< myFeatures.length; i++) {
				var cloneFeature = myFeatures[i].clone();
				var geom4326 = cloneFeature.getGeometry().transform('EPSG:3857', 'EPSG:4326');
				cloneFeature.setGeometry(geom4326);
				cloneArray.push(cloneFeature);
			}

			var myFile = '';
			switch(layerType) {
				case 'kml':
					//FIX: writeFeatures for KML format has bugs. Adds ,0 at the end of the points and doesnt parse time
					myFile = new ol.format.KML().writeFeatures(cloneArray);
					console.log(myFile);
					break;
				case 'geojson':
					myFile = new ol.format.GeoJSON().writeFeatures(cloneArray);
					break;
			}

			if (myFile != '') {
				$.ajax({
			        type: 'POST',
			        url: rootURL + '/createFile/' + layerName + "/" + layerType,
			        data: myFile,
			        dataType: 'text',
			        headers: {
			        	//'Accept-Charset' : 'utf-8',
			        	'Content-Type'   : 'text/plain; charset=utf-8',
			        },
			        timeout: ajaxTimeout,
			        success: createFileFromSource,
			        error: printError,
			        layerName: layerName
			    });
			}

	    });

		initTimeline();

	}

	//Parse host to determine if the client is bind to a server or stand-alone
	var getServer = window.location.href.split('/');
	if (getServer[0] == 'http:') {
		document.getElementById('serverSelection').innerHTML = null;
	}

	//Set parameters for calendars

    // $('.datetimepicker').datetimepicker({
    //     format: 'YYYY-MM-DD',
    //     ignoreReadonly: true
    // });
    //
    // $('.wmsDate').datetimepicker({
    //     format: 'YYYY-MM-DDTHH:mm:ssZ',
    //     ignoreReadonly: true
    // });
    //
    // var nowDate = new Date();
    // var today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0);
    //
    // var copernicusMinEventDate = new Date(1900, 0, 1, 0, 0, 0, 0);
    // $('.copernicusEventDate').datetimepicker({
    //         format: 'YYYY-MM-DD',
    //         minDate: copernicusMinEventDate,
    //         maxDate: today,
    //         ignoreReadonly: true
    // });
    //
    // var copernicusMinReferenceDate = new Date(1900, 0, 1, 0, 0, 0, 0);
    // $('.copernicusReferenceDate').datetimepicker({
    //         format: 'YYYY-MM-DD',
    //          minDate: copernicusMinReferenceDate,
    //          maxDate: today,
    //          ignoreReadonly: true
    // });

    disableFeatures(disableAll, disableSaveMap);

    //Initialize AlaSQL
    alasql('CREATE DATABASE gadm28; USE gadm28;');
    alasql('CREATE TABLE geodata; SELECT * INTO geodata FROM CSV("./assets/resources/gadm28.csv", {headers:true, separator:";"})');

    document.getElementsByClassName('timeline-band-0')[0].style.backgroundColor = 'rgba(255,255,255,0)';
    document.getElementsByClassName('timeline-band-1')[0].style.backgroundColor = 'rgba(255,255,255,0)';
    mapF();
    addSelect();

}

function clearOverlayFeatures() {
	featureOverlay.getSource().getSource().clear();
}

function createFileFromSource(results, status, jqXHR) {
	var name = this.layerName;
	for (var i=0; i<mapLayers.length; i++) {
		if (mapLayers[i].name === name) {
    		mapLayers[i].uri = results.toString();
        	break;
		}
	}
	document.getElementById('downloadLayerButton'+name).disabled = false;
}

/**
 * Create the layer on the map using OpenLayers 3
 */
function addLayer(url, name, isTemp, type, text, endpoint, mapId, localFile, path, style, bbox, imageSize) {
	if (url == 'null') {
		url = null;
	}

	//Hide server messages
	hideSpinner();
	document.getElementById('alertMsgServerDownload').style.display = 'none';

	if (url && name){
    	for (var i=0; i<mapLayers.length; i++) {
    		if (mapLayers[i].name === name) {
    			//Print error and return
    			document.getElementById('alertMsgFailNameExists').style.display = 'block';
    	        setTimeout(function() {$('#alertMsgFailNameExists').fadeOut('slow');}, fadeTime);
    	        return ;
    		}
    	}

        //KML
    	if (type === "kml") {

    		var tl = new Layer(name, url, isTemp, type, text, endpoint, '#ff9900', '#ff9900', '', '', mapId, '', '');
            mapLayers.push(tl);

            if(localFile && path) {
        	    //Upload the file to the JerseyServer so that we can have an absolute URI for saving and loading a map.
            	document.getElementById('alertMsgServerUpload').style.display = 'block';
            	uploadLocalFileToServer(localFile, name, layerName, type, function(results) {
            		setTimeout(function() {$('#alertMsgServerUpload').fadeOut('slow');}, fadeTimeFast);
            		mapLayers[mapLayers.length-1].uri = results;
                	addKmlLayer(name, results, style, isTemp);
            	});
            }
            else if (path) {
            	//Upload file to server and create the layer
        		document.getElementById('alertMsgServerDownload').style.display = 'block';
	        	downloadFile(url, function(result) {
	        		setTimeout(function() {$('#alertMsgServerDownload').fadeOut('slow');}, fadeTimeFast);
	        		addKmlLayer(name, result, style, isTemp);
	        	});
            }
            else {
            	//The layer is produced by query, or is local and is loaded from existing map, so it's file exists
            	addKmlLayer(name, url, style, isTemp);
            }

	    	//Reset form data
	        document.getElementById('hiddenLoadKml').reset();
    	}

    	/*
    	//GML
    	if (type === "gml") {
    		var tl = new Layer(name, url, isTemp, type, text, endpoint, '#FFB414', '#FFB414', './assets/images/map-pin-md.png', 20, mapId, '', '');
            mapLayers.push(tl);

            if(localFile && path) {
            	//Upload the file to the JerseyServer so that we can have an absolute URI for saving and loading a map.
            	document.getElementById('alertMsgServerUpload').style.display = 'block';
            	uploadLocalFileToServer(localFile, name, layerName, type, function(results) {
            		setTimeout(function() {$('#alertMsgServerUpload').fadeOut('slow');}, fadeTimeFast);
            		mapLayers[mapLayers.length-1].uri = results;
                	addGmlLayer(name, results, style, isTemp);
            	});
            }
            else if (path){
            	//Upload file to server and create the layer
        		document.getElementById('alertMsgServerDownload').style.display = 'block';
	        	downloadFile(url, function(result) {
	        		setTimeout(function() {$('#alertMsgServerDownload').fadeOut('slow');}, fadeTimeFast);
	        		addGmlLayer(name, result, style, isTemp);
	        	});
            }
            else {
            	//The layer is produced by query, or is local and is loaded from existing map, so it's file exists
            	addGmlLayer(name, url, style, isTemp);
            }

	    	//Reset form data
	        document.getElementById('hiddenLoadGml').reset();
    	} */

    	//JSON
    	if (type === "geojson" || type === "topojson") {

    		var tl = new Layer(name, url, isTemp, type, text, endpoint, '#ff9900', '#ff9900', '', '', mapId, '', '');
            mapLayers.push(tl);

            if(localFile && path) {
            	//Upload the file to the JerseyServer so that we can have an absolute URI for saving and loading a map.
            	document.getElementById('alertMsgServerUpload').style.display = 'block';
            	uploadLocalFileToServer(localFile, name, layerName, type, function(results) {
            		setTimeout(function() {$('#alertMsgServerUpload').fadeOut('slow');}, fadeTimeFast);
            		mapLayers[mapLayers.length-1].uri = results;
                	addJSONLayer(name, results, style, isTemp, type);
            	});
            }
            else if (path){
            	//Upload file to server and create the layer
        		document.getElementById('alertMsgServerDownload').style.display = 'block';
	        	downloadFile(url, function(result) {
	        		setTimeout(function() {$('#alertMsgServerDownload').fadeOut('slow');}, fadeTimeFast);
	        		addJSONLayer(name, result, style, isTemp, type);
	        	});
            }
            else {
            	//The layer is produced by query, or is local and is loaded from existing map, so it's file exists
            	addJSONLayer(name, url, style, isTemp, type);
            }

	    	//Reset form data
	        document.getElementById('hiddenLoadGml').reset();
    	}

    	//GeoTiff
    	if (type === 'geotiff'){
        	var tl = new Layer(name, url, isTemp, type, text, endpoint, '', '', '', '', mapId, imageSize.toString().concat(",").concat(bbox.toString()), '');
        	mapLayers.push(tl);

        	if(localFile && path) {
        		//Upload the file to the JerseyServer so that we can have an absolute URI for saving and loading a map.
            	document.getElementById('alertMsgServerUpload').style.display = 'block';
            	uploadLocalFileToServer(localFile, name, layerName, type, function(results) {
            		setTimeout(function() {$('#alertMsgServerUpload').fadeOut('slow');}, fadeTimeFast);
            		mapLayers[mapLayers.length-1].uri = results;
            		addGeoTiffLayer(name, results, bbox, imageSize);
            	});
            }
            else if (path){
            	//Upload file to server and create the layer
        		document.getElementById('alertMsgServerDownload').style.display = 'block';
	        	downloadFile(url, function(result) {
	        		setTimeout(function() {$('#alertMsgServerDownload').fadeOut('slow');}, fadeTimeFast);
	        		addGeoTiffLayer(name, result, bbox, imageSize);
	        	});
            }
            else {
            	//The layer is produced by query, or is local and is loaded from existing map, so it's file exists
            	addGeoTiffLayer(name, url, bbox, imageSize);
            }

    		//Reset form data
            document.getElementById('hiddenLoadGeoTiff').reset();
    	}

    	//WMS
    	if (type === 'wms'){
    		var wmsTypeInfo = [type, path[1], path[2], path[3]];
        	var tl = new Layer(name, url+'#'+path[0], isTemp, wmsTypeInfo.toString(), text, endpoint, style, '', '', '', mapId, '', '');
        	mapLayers.push(tl);
        	cloneWMSList(url, name, path[0], style, [path[1], path[2], path[3]], isTemp);
    	}

    	//Add a row for this layer in the Manage Layers view
        addTableRow(name, type);

        //Show renewed last modification date and number of layers
        document.getElementById('infoNumOfLayers').innerHTML = mapLayers.length;

    }
    else if (text == "") {
    	document.getElementById('alertMsgFailEmpty').style.display = 'block';
        setTimeout(function() {$('#alertMsgFailEmpty').fadeOut('slow');}, fadeTime);
    }

}

/**
 * Create a URL for the localfile
 */
function createURL(localFile) {
	var fileURL = null;
	if (localFile) {
    	if (window.URL) {
    		fileURL = window.URL.createObjectURL(localFile);
    	}
    	else {
    		fileURL = window.webkitURL.createObjectURL(localFile);
    	}
    }
	return fileURL;
}

/**
 * When browsing for local file, show the name of the chosen file
 * in the layer URL text field.
 */
function showFileName() {
	var temp = $('#fileName').val().split('\\');
	$('#layerUrl').val(temp[2]);
}

function showFileNameGml() {
	var temp = $('#fileNameGml').val().split('\\');
	$('#layerUrlGml').val(temp[2]);
}

function showFileNameJSON() {
	var temp = $('#fileNameJSON').val().split('\\');
	$('#layerUrlJSON').val(temp[2]);
}

function showFileNameGeoTiff() {
	var temp = $('#fileNameGeoTiff').val().split('\\');
	$('#layerUrlGeoTiff').val(temp[2]);
}

function showFileNameGDAL() {
	var temp = $('#fileNameGDAL').val().split('\\');
	$('#layerUrlGdal').val(temp[2]);
}

function showIconName() {
	var temp = $('#iconName').val().split('\\');
	$('#iconUrl').val(temp[2]);
}

function showUserIconName() {
	var temp = $('#userIconName').val().split('\\');
	$('#userIconUrl').val(temp[2]);
}

function clearPopup() {
	clearOverlayFeatures();
	overlay.setPosition(undefined);
    closer.blur();
    return false;
}

function checkLayerURL(name, url) {
	$.ajax({
        type: 'GET',
        url: url,
        timeout: ajaxTimeout,
        success: checkURLSuccess,
        error: checkURLError,
        layerName: name
    });
}

function checkURLSuccess(results, status, jqXHR) {
	//console.log('Layer source OK.');
}

function checkURLError(jqXHR, textStatus, errorThrown) {
	var layerName = this.layerName;
	//console.log('Layer source ERROR: '+layerName);
	document.getElementById('alertURLinvalid').style.display = 'block';
    setTimeout(function() {$('#alertURLinvalid').fadeOut('slow');}, fadeTime);

    var index = -1;
    var table = document.getElementById('layerTable');
    var tableRef = document.getElementById('layerTable').getElementsByTagName('tbody')[0];
    for (var i=0; i<table.rows.length; i++) {
        if (table.rows[i].cells[1].innerHTML == layerName) {
            index = i;
            break;
        }
    }
    tableRef.deleteRow(index);
    mapLayers.splice(index, 1);
}

function drawStations(){
  var req = new XMLHttpRequest();
  req.open("GET", "./data/stat_info.json", true);
  req.setRequestHeader('Content-Type', 'plain/text; charset=utf-8');
  req.onreadystatechange = function() {
      if (req.readyState == XMLHttpRequest.DONE) {
          var stations = JSON.parse(req.responseText);
          inner = '';
          chart = document.getElementById('stat_info');
          for (var i = 0; i < stations.length; i++) {
            lnglt = [parseFloat(stations[i]["lon"]),parseFloat(stations[i]["lat"])];
            var feat = new ol.Feature(new ol.geom.Point(ol.proj.transform(lnglt, 'EPSG:4326', 'EPSG:3857')));
            feat.setId(stations[i]['name'])
            var style = new ol.style.Style({
                      image: new ol.style.Icon({
                          src: 'http://test.strabon.di.uoa.gr/Sextant2/assets/images/map-pin-md.png',
                          size: [186, 297],
                          scale: 0.1
                      })
                  });
            feat.setStyle(style);
            var vec = vector.getSource();
            vec.addFeature(feat);
            inner += '<div id="'+stations[i]['name']+'" style="display:none;"><h2>Station name: '+stations[i]['name']+' ('+stations[i]['country']+')</h2>Coordinates (latitude,longitude): '+stations[i]['lat']+', '+stations[i]['lon']+'<br><img src="'+stations[i]['image']+'" id="plantimg" height="150" width="300"></img></div>';
          }
          chart.innerHTML = inner;
      }
  }
  req.send();
}





var select = new ol.interaction.Select({
    condition: ol.events.condition.click,
    filter: function(feature) {
        try{
           var id = feature.getId();
           var s = document.getElementById('stat_info');
             for(i=0; i<s.childNodes.length; i++) {
               if (s.childNodes[i].id == id)
               {return true;}
             }
        }
        catch (e) { return false;}
    }
});

function addSelect(){
  animateStatsPanel();
  mapFilter.addInteraction(select);
  select.on('select', function(e) {
    // alert(e.selected[0].getId());
    var s = document.getElementById('stat_info');
    for(i=0; i<s.childNodes.length; i++) {
    s.childNodes[i].style.display = 'none';
    }
    var div = document.getElementById(e.selected[0].getId());
    div.style.display = 'block';
  });
}

function removeSelect(){
  mapFilter.removeInteraction(select);
}

function getMethods(){
  var req = new XMLHttpRequest();
  req.open("GET", "http://127.0.0.1:5000/getMethods/", true);
  req.setRequestHeader('Content-Type', 'plain/text; charset=utf-8');
  req.onreadystatechange = function() {
      if (req.readyState == XMLHttpRequest.DONE) {
        var methodlist = JSON.parse(req.responseText);
        var str = '';
        for (var i=0;i<methodlist.length;i++){
           str += '<input type="radio" name="cluster" value="' + methodlist[i] + '">' + methodlist[i] + '<br>';
        }
        document.getElementById('clust').innerHTML = str;
      }
    }
    req.send();
}
