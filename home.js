document.addEventListener('DOMContentLoaded', function () {
    // Function to ask for location permission
    function askForLocationPermission() {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(function (permissionStatus) {
                if (permissionStatus.state === 'granted') {
                    locateUser(); // If permission is already granted, proceed with locating the user
                } else if (permissionStatus.state === 'prompt') {
                    // If permission is not yet determined, prompt the user for permission
                    navigator.geolocation.getCurrentPosition(locateUser, function (error) {
                        console.error('Error getting user location:', error.message);
                        alert('Error getting your location. Please make sure you allow location access.');
                    });
                } else {
                    // Permission denied
                    alert('Location access is denied. Please enable it in your device settings.');
                }
            });
        } else {
            // For browsers not supporting navigator.permissions
            alert('Your browser does not support the Permissions API. Please make sure to allow location access.');
        }
    }

    // Call the function to ask for location permission when the document is loaded
    askForLocationPermission();

    var map = L.map('map', {
        zoomControl: false // Disable zoom control
    }).setView([12.8797, 121.7740], 6);

    // Tile Layer
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    osm.addTo(map);

    // Variables Initialization
    var myLocationMarker;
    var fixedMarker;
    var searchMarker;
    var routingControl;
    var fixedState = false;
    var toolsUse = document.getElementById("tools");
    var distanceElement = document.getElementById("distance");
    var timeElement = document.getElementById("time");
    var directionsList = document.getElementById("directions-list");
    var directions; // Store route instructions
    var currentStepIndex; // Current step index in directions
    var directionUpdateInterval; // Interval for automatic direction update

    // Search Control
    var searchControl = L.Control.geocoder({
        defaultMarkGeocode: false,
        collapsed: false,
        placeholder: 'Search...',
    }).on('markgeocode', function (e) {
        // Search Marker Handling
        if (searchMarker) {
            map.removeLayer(searchMarker);
        }
        var latlng = e.geocode.center;
        map.setView(latlng, 14);
        searchMarker = L.marker(latlng, { draggable: true }).addTo(map);
        searchMarker.on('dragend', function (e) {
            var newLatLng = e.target.getLatLng();
            searchMarker.setLatLng(newLatLng);
            checkbtnStart();
        });
        checkbtnStart();
    }).addTo(map);

    // Functions
    function locateUser() {
        // Geolocation API
        if (navigator.geolocation) {
            // Continuously watch user's position
            navigator.geolocation.watchPosition(function (position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;
                var userLocation = L.latLng(userLat, userLng);
                if (myLocationMarker) {
                    myLocationMarker.setLatLng(userLocation); // Update marker position
                } else {
                    myLocationMarker = L.marker(userLocation, { draggable: false }).addTo(map);
                }
                myLocationMarker.bindPopup("<b>My Location</b>").openPopup();
                map.setView(userLocation, 14);
                checkbtnStart();
            }, function (error) {
                console.error('Error getting user location:', error.message);
                alert('Error getting your location. Please make sure you allow location access.');
            });
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    function zoomToMyLocation() {
        if (myLocationMarker) {
            map.setView(myLocationMarker.getLatLng(), 14);
        } else {
            alert('Your location has not been determined yet.');
        }
    }

    function clearRouting() {
        // Clear Routing Control
        if (routingControl) {
            map.removeControl(routingControl);
            distanceElement.textContent = '';
            timeElement.textContent = '';
            directionsList.innerHTML = '';
        }
    }

    // Event Listeners
    document.getElementById("btnLocate").addEventListener("click", zoomToMyLocation);

    document.getElementById("btnStart").addEventListener("click", function () {
        if (routingControl) {
            // Stop Button Functionality
            map.removeControl(routingControl);
            searchMarker.dragging.enable();
            if (fixedMarker) {
                map.removeLayer(fixedMarker);
                fixedMarker = null;
            }
            document.getElementById("btnStart").innerHTML = '<i class="fas fa-play"></i>';
            routingControl = null;
            distanceElement.textContent = ''; // Reset distance
            timeElement.textContent = ''; // Reset time
            directionsList.innerHTML = ''; // Reset directions
            // Clear tools
            toolsUse.style.display = "none";
        } else {
            // Start Button Functionality
            if (myLocationMarker && searchMarker) {
                clearRouting();

                routingControl = L.Routing.control({
                    waypoints: [
                        myLocationMarker.getLatLng(),
                        searchMarker.getLatLng()
                    ],
                    routeWhileDragging: false, // Disable dragging while routing
                    createMarker: function () { return null; }, // Disable creation of new markers
                    show: false, // Hide the route line initially
                    addWaypoints: false, // Prevent adding additional waypoints
                }).addTo(map);

                // Zoom to user location marker
                map.setView(myLocationMarker.getLatLng(), 14);

                // Draggable markers for route start and end points
                fixedMarker = L.layerGroup([L.marker(myLocationMarker.getLatLng(), { draggable: false }), L.marker(searchMarker.getLatLng(), { draggable: false })]).addTo(map);
                fixedMarker.eachLayer(function (layer) {
                    layer.on('dragend', function (e) {
                        var newLatLng = e.target.getLatLng();
                        searchMarker.setLatLng(newLatLng);
                    });
                });

                document.getElementById("btnStart").innerHTML = '<i class="fas fa-stop"></i>';

                // Update distance, time, and directions
                routingControl.on('routesfound', function (e) {
                    var routes = e.routes;
                    var summary = routes[0].summary;
                    var totalDistanceKm = (summary.totalDistance / 1000).toFixed(1) + ' km';
                    var totalDistanceMeters = summary.totalDistance + ' m';
                    var totalDistanceFeet = (summary.totalDistance * 3.28084).toFixed(1) + ' ft';
                    var totalTimeMinutes = (summary.totalTime / 60).toFixed(1) + ' min';

                    distanceElement.textContent = totalDistanceKm + " | " + totalDistanceMeters + " | " + totalDistanceFeet;
                    timeElement.textContent = "Time: " + totalTimeMinutes;

                    // Outputting the distances in meters and feet
                    console.log("Distance in kilometers: " + totalDistanceKm);
                    console.log("Distance in meters: " + totalDistanceMeters);
                    console.log("Distance in feet: " + totalDistanceFeet);


                    // Store route instructions
                    directions = routes[0].instructions;
                    // Start automatic direction update
                    startAutomaticDirectionUpdate();
                    // Show tools
                    toolsUse.style.display = "block";
                });

                routingControl.on('routeselected', function (e) {
                    var route = e.route;
                    var summary = route.summary;
                    var totalDistanceKm = (summary.totalDistance / 1000).toFixed(1) + ' km';
                    var totalDistanceMeters = summary.totalDistance + ' m';
                    var totalDistanceFeet = (summary.totalDistance * 3.28084).toFixed(1) + ' ft';
                    var totalTimeMinutes = (summary.totalTime / 60).toFixed(1) + ' min';

                    distanceElement.textContent = totalDistanceKm + " | " + totalDistanceMeters + " | " + totalDistanceFeet;
                    timeElement.textContent = "Time: " + totalTimeMinutes;

                    // Outputting the distances in meters and feet
                    console.log("Distance in kilometers: " + totalDistanceKm);
                    console.log("Distance in meters: " + totalDistanceMeters);
                    console.log("Distance in feet: " + totalDistanceFeet);

                    // Store route instructions
                    directions = route.instructions;
                    // Start automatic direction update
                    startAutomaticDirectionUpdate();
                    // Show tools
                    toolsUse.style.display = "block";
                });

            }
        }
    });


    // Function to start automatic direction update
    function startAutomaticDirectionUpdate() {
        // Reset step index
        currentStepIndex = 0;
        // Update direction initially
        updateDirection();
        // Update direction when the user marker moves
        myLocationMarker.on('move', updateDirectionOnMove);
    }

    // Function to update direction when the user marker moves
    function updateDirectionOnMove() {
        var userPosition = myLocationMarker.getLatLng();
        var currentWaypoint = directions[currentStepIndex].latLng;
        var distanceToWaypoint = userPosition.distanceTo(currentWaypoint);
        if (distanceToWaypoint < 1) { // Adjust the distance threshold as needed
            updateDirection();
        }
    }

    // Function to update direction
    function updateDirection() {
        if (currentStepIndex < directions.length) {
            var li = document.createElement("li");
            li.textContent = directions[currentStepIndex].text;
            directionsList.innerHTML = "";
            directionsList.appendChild(li);
            currentStepIndex++;
        } else {
            clearInterval(directionUpdateInterval); // Stop automatic direction update
        }
    }

    locateUser(); // Initial location check
});