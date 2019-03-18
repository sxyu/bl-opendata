$(document).ready(function(){
        /*-- Celestial initialization --*/
        /* D3-Celestial sky map
           Copyright 2015 Olaf Frohn https://github.com/ofrohn, see LICENSE
           
           Edit configuration to your liking and display in browser. 
           Data files in folder data for stars and DSOs, number indicates limit magnitude, 
           or roll your own with the format template in templ.json
        */
        
        /* create a default Celestial config object, with parent object ID 'containerName' */
        var getCelestialConfig = function(containerName = "celestial-map") { 
          return {
              width: 0, 
              projection: "airy", 
              transform: "equatorial",
              center: null,   
              orientationfixed: true,
              background: { fill: "#000000", stroke: "#000000", opacity: 1 },
              adaptable: true,
              interactive: true,
              controls: false, 
              container: containerName,   // ID of parent element, e.g. div
              datapath: "/data/",  // Path/URL to data files, empty = subfolder 'data'
              stars: {
                show: true, limit: 5, colors: true, 
                style: { fill: "#ffffff", opacity: 1 },
                names: false,
                proper: true,
                desig: false,
                namelimit: 2.2,
                namestyle: { fill: "#ddddbb", font: "9px Georgia, Times, 'Times Roman', serif", align: "left", baseline: "top" },
                propernamestyle: { fill: "#aaaaaa", font: '9px Georgia, Times, "Times Roman", serif' },
                propernamelimit: 1.5,
                size: 4,
                exponent: -0.28,
                data: 'stars.6.json'
              },
              dsos: {
                show: true,    // Show Deep Space Objects 
                limit: 5,      // Show only DSOs brighter than limit magnitude
                names: true,   // Show DSO names
                desig: true,   // Show short DSO names
                namelimit: 3.5,  // Show only names for DSOs brighter than namelimit
                namestyle: { fill: "#aaaaaa", font: '9px Roboto, "Helvetica Neue", Arial, sans-serif', align: "left", baseline: "top" },
                size: null,    // Optional seperate scale size for DSOs, null = stars.size
                exponent: 1.4, // Scale exponent for DSO size, larger = more non-linear
                data: 'dsos.bright.json',  // Data source for DSOs
                symbols: {  //DSO symbol styles
                  gg: {shape: "circle", fill: "#999999"},                                 // Galaxy cluster
                  g:  {shape: "ellipse", fill: "#999999"},                                // Generic galaxy
                  s:  {shape: "ellipse", fill: "#999999"},                                // Spiral galaxy
                  s0: {shape: "ellipse", fill: "#999999"},                                // Lenticular galaxy
                  sd: {shape: "ellipse", fill: "#999999"},                                // Dwarf galaxy
                  e:  {shape: "ellipse", fill: "#999999"},                                // Elliptical galaxy
                  i:  {shape: "ellipse", fill: "#999999"},                                // Irregular galaxy
                  oc: {shape: "circle", fill: "#999999", stroke: "#cccccc", width: 1.5},  // Open cluster
                  gc: {shape: "circle", fill: "#999999"},                                 // Globular cluster
                  en: {shape: "square", fill: "#999999"},                                 // Emission nebula
                  bn: {shape: "square", fill: "#999999", stroke: "#cccccc", width: 1},    // Generic bright nebula
                  sfr:{shape: "square", fill: "#999999", stroke: "#cccccc", width: 1},    // Star forming region
                  rn: {shape: "square", fill: "#999999"},                                 // Reflection nebula
                  pn: {shape: "diamond", fill: "#999999"},                                // Planetary nebula 
                  snr:{shape: "diamond", fill: "#ff0000", stroke: "#0000ff", width: 4},   // Supernova remnant
                  dn: {shape: "square", fill: "#999999", stroke: "#cccccc", width: 2},    // Dark nebula grey
                  pos:{shape: "marker", fill: "#cccccc", stroke: "#cccccc", width: 1.5}   // Generic marker
                }
              },
              planets : {
                show: false,
              },
              constellations : {
                show: false,
                lines: false,
                bounds: true
              },
              mw: {
                show: true,
                style: { fill: "#ffffff", opacity: "0.15" }
              },
              lines: {
                graticule: { show: true, stroke: "#cccccc", width: 0.6, opacity: 0.8, 
                  lon: {pos: ["center"], fill: "#eee", font: "10px Helvetica, Arial, sans-serif"}, 
                      lat: {pos: ["center"], fill: "#eee", font: "10px Helvetica, Arial, sans-serif"}},
                equatorial: { show: true, stroke: "#aaaaaa", width: 1.3, opacity: 0.7 },
                ecliptic: { show: false, stroke: "#66cc66", width: 1.3, opacity: 0.7 },
                galactic: { show: true, stroke: "#cc6666", width: 1.3, opacity: 0.7 },
                supergalactic: { show: false, stroke: "#cc66cc", width: 1.3, opacity: 0.7 }
                } // lines
          }; // return
        }; // getCelestialConfig
        
        var celestialNeedUpdate = false;
        var celestialCenterPos = [0, 0];
        
        /* update celestial map with parent container ID 'containerName' */
        var updateCelestial = function(containerName = "celestial-map") {
            Celestial.display(getCelestialConfig(containerName));
            celestialNeedUpdate = false;
        }
        
        /* add objects objs with attributes 'ra', 'decl', 'target' to the celestial map */
        var addObjsToCelestial = function(objs, containerName = "celestial-map") {
            // filter out close objects
            var objsFiltered = [];
            const EPS = 1.0;
            for (var i = 0; i < objs.length; i++) {
                var firstIndex = -1;
                for (var j = 0; j < objsFiltered.length; j++) {
                    var good = true;
                    if (Math.abs(objsFiltered[j][0] - objs[i]['ra']) > EPS) continue;
                    if (Math.abs(objsFiltered[j][1] - objs[i]['decl']) > EPS) continue;
                    if (objsFiltered[j][2] !== objs[i]['target']) continue;
                    
                    firstIndex = j;
                    break;
                }
                if (firstIndex === -1) {
                    objsFiltered.push([objs[i]['ra'], objs[i]['decl'], objs[i]['target']]);
                }
            };
            // create GeoJSON object
            var feats = [];
            for (var i = 0; i < Math.min(objsFiltered.length, 250); ++i) {
                var ra = objsFiltered[i][0];
                if (ra > 180) ra -= 360;
                var dec = objsFiltered[i][1];
                var tgt = objsFiltered[i][2];
                feats.push(
                    {"type":"Feature",
                     "id": i+tgt,
                     "properties": {
                       // Name
                       "name": tgt,
                       // magnitude, dimension in arcseconds or any other size criterion
                       "mag": 10,
                       "dim": 30
                     }, "geometry":{
                       // the location of the object as a [ra, dec] array in degrees [-180..180, -90..90]
                       "type":"Point",
                       "coordinates": [ra, dec]
                     }
                    }  
                ); // feats.push
            } // for
            
            Celestial.clear();
            if (objsFiltered.length > 0) {
                var jsonSN = {
                  "type":"FeatureCollection",
                  "features": feats
                };
                  
                // initialize styles
                var pointStyle = { 
                      stroke: "#f0f", 
                      width: 2,
                      fill: "rgba(255, 204, 255, 0.4)"
                };
                var textStyle = { 
                    fill:"#f1f", 
                    font: '9px Roboto, "Helvetica Neue", Arial, sans-serif', 
                    align: "left", 
                    baseline: "bottom" 
                };
              
                // add to Celestial
                Celestial.add({type:"line", 
                    callback: function(error, json) {
                      if (error) return console.warn(error);
                      // Load the geoJSON file and transform to correct coordinate system, if necessary
                      var dsn = Celestial.getData(jsonSN, getCelestialConfig(containerName).transform);

                      // Add to celestial objects container in d3
                      Celestial.container.selectAll(".snrs")
                        .data(dsn.features)
                        .enter().append("path")
                        .attr("class", "snr"); 
                      // Trigger redraw to display changes
                      Celestial.redraw();
                    }, //callback
                    redraw: function() {
                      // Select the added objects by class name as given previously
                      Celestial.container.selectAll(".snr").each(function(d) {
                        // If point is visible (this doesn't work automatically for points)
                        if (Celestial.clip(d.geometry.coordinates)) {
                          // get point coordinates
                          var pt = Celestial.mapProjection(d.geometry.coordinates);
                          // object radius in pixel, could be varable depending on e.g. dimension or magnitude 
                          var r = Math.pow(0.25 * d.properties.dim, 0.5); // replace 20 with dimmest magnitude in the data
                       
                          // draw on canvas
                          //  Set object styles fill color, line color & width etc.
                          Celestial.setStyle(pointStyle);
                          // Start the drawing path
                          Celestial.context.beginPath();
                          // Thats a circle in html5 canvas
                          Celestial.context.arc(pt[0], pt[1], r, 0, 2 * Math.PI);
                          // Finish the drawing path
                          Celestial.context.closePath();
                          // Draw a line along the path with the prevoiusly set stroke color and line width      
                          Celestial.context.stroke();
                          // Fill the object path with the prevoiusly set fill color
                          Celestial.context.fill();     

                          // Set text styles       
                          Celestial.setTextStyle(textStyle);
                          // and draw text on canvas
                          Celestial.context.fillText(d.properties.name, pt[0] + r - 1, pt[1] - r + 1);
                        }      
                      }); 
                    } //redraw
                }); //add
                if ($('#' + containerName).parent().parent().parent().css('display') != 'none') {
                    // if shown
                    Celestial.rotate({ center : [objsFiltered[0][0], objsFiltered[0][1], 0] });
                    updateCelestial(containerName);
                } else {
                    celestialCenterPos = [objsFiltered[0][0], objsFiltered[0][1], 0];
                    celestialNeedUpdate = true;
                }
            } else {
                if ($('#' + containerName).parent().parent().parent().css('display') != 'none') {
                    // if shown
                    updateCelestial(containerName);
                } else {
                    celestialNeedUpdate = true;
                }
            }
        } // addObjsToCelestial
        
        updateCelestial();
    
        /* convert 'bytes' to human readable file size. If 'si' is set, uses MB, GB, etc. instead of MiB, etc. */
        function _humanFileSize(bytes, si) {
            var thresh = si ? 1000 : 1024;
            if(Math.abs(bytes) < thresh) {
                return bytes + ' B';
            }
            var units = si
                ? ['KB','MB','GB','TB','PB','EB','ZB','YB']
                : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
            var u = -1;
            do {
                bytes /= thresh;
                ++u;
            } while(Math.abs(bytes) >= thresh && u < units.length - 1);
            return bytes.toFixed(1)+' '+units[u];
        }
    
        /*-- API interface --*/
        var results = $('#results');
        var queryBox = $('#query');
        var inputError = $('#input-error');
        
        // floating-point printing precision
        const PRECISION = 1e4;
        
        var dataTable = $('#results-table').DataTable({
            pageLength: 25,
        });
        $('#results-table > thead > tr> th:nth-child(1)').css({ 'min-width': '74px' });
        $('#results-table > thead > tr> th:nth-child(4)').css({ 'min-width': '100px' });
        
        // stores all targets and synonyms
        var targets = {};
        
        var showError = function(msg) {
            inputError.text(msg);
            inputError.show();
        }
        
        /* send an API call to update the query table, retrieving up to 'lim' entries
         * (0 = retrieve all) */
        var _updateQuery = function(lim = 0) {
            // construct API call
            var data = {};
            // query string (target)
            var queryStr = queryBox[0].value;
            data['target'] = queryStr;
            
            // telescopes
            var telGBT = $('#telescope-gbt')[0].checked;
            var telParkes = $('#telescope-parkes')[0].checked;
            var telAPF = $('#telescope-apf')[0].checked;
            if (!(telGBT && telParkes && telAPF)) {
                telStr = "";
                if (telGBT) telStr += "gbt,";
                if (telParkes) telStr += "parkes,";
                if (telAPF) telStr += "apf,";
                if (telStr.length == 0) {
                    showError("Please select at least one telescope.");
                    return;
                }
                data['telescopes'] = telStr.substr(0, telStr.length-1);
            }
            
            // file types
            var ftypeFil = $('#ftype-fil')[0].checked;
            var ftypeHDF5 = $('#ftype-hdf5')[0].checked;
            var ftypeBaseband = $('#ftype-baseband')[0].checked;
            var ftypeFITS = $('#ftype-fits')[0].checked;
            if (!(ftypeFil && ftypeHDF5 && ftypeBaseband && ftypeFITS)) {
                ftypeStr = "";
                if (ftypeFil) ftypeStr += "filterbank,";
                if (ftypeHDF5) ftypeStr += "hdf5,";
                if (ftypeBaseband) ftypeStr += "baseband data,";
                if (ftypeFITS) ftypeStr += "fits,";
                if (ftypeStr.length == 0) {
                    showError("Please select at least one file type.");
                    return;
                }
                data['file-types'] = ftypeStr.substr(0, ftypeStr.length-1);
            }
            
            // position
            var posEnabled = $('#pos-enable')[0].checked;
            if (posEnabled) {
                var posRA = $('#pos-ra').val();
                var posDec = $('#pos-decl').val();
                var posRad = $('#pos-rad').val();
                data['pos-ra'] = parseFloat(posRA);
                data['pos-dec'] = parseFloat(posDec);
                data['pos-rad'] = parseFloat(posRad);
            }
            
            // time
            var timeStart = parseFloat($('#time-start').val());
            var timeEnd = parseFloat($('#time-end').val());
            if (timeStart > timeEnd) {
                showError("Start time " + timeStart + " cannot be greater than end time " + timeEnd + ".");
                return;
            }
            if (timeStart > parseFloat($('#time-start')[0].min) || timeEnd < parseFloat($('#time-end')[0].max)) {
                data['time-start'] = timeStart;
                data['time-end'] = timeEnd;
            }
            
            // freq
            var freqStart = parseFloat($('#freq-start').val());
            var freqEnd = parseFloat($('#freq-end').val());
            if (freqStart > freqEnd) {
                showError("Min frequency " + freqStart + " cannot be greater than max frequency" + freqEnd + ".");
                return;
            }
            if (freqStart > parseFloat($('#freq-start')[0].min) || freqEnd < parseFloat($('#freq-end')[0].max)) {
                data['freq-start'] = freqStart;
                data['freq-end'] = freqEnd;
            }
            
            if (lim > 0) {
                data['limit'] = lim;
            }
            
            // call API to get new data
            $.ajax({
              dataType: "json",
              url: BreakthroughAPI.query_api_url,
              data: data,
              success: function(result) {
                  if (result['result'] != "success") {
                      showError(result['message']);
                      return;
                  }
                  // update the datatable
                  dataTable.clear();
                  var entries = result['data'];
                  for (var i = 0; i < entries.length; i++) {
                    var date = new Date(entries[i]['utc'])
                    dataTable.row.add([
                        date.toLocaleDateString() + " " + date.toLocaleTimeString(),
                        Math.round(entries[i]['mjd'] * PRECISION) / PRECISION,
                        entries[i]['telescope'],
                        entries[i]['target'],
                        Math.round(entries[i]['ra'] * PRECISION) / PRECISION,
                        Math.round(entries[i]['decl'] * PRECISION) / PRECISION,
                        Math.round(entries[i]['center_freq'] * PRECISION) / PRECISION,
                        entries[i]['file_type'],
                        _humanFileSize(entries[i]['size'], false),
                        '<a class="download-link" href="'+entries[i]['url']+'" title="MD5Sum: ' + entries[i]['md5sum'] + '"><i class="fas fa-cloud-download-alt"></i></a>',
                    ]);
                  }
                  addObjsToCelestial(entries);
                  dataTable.draw();
                  
                  results.show();
                  inputError.hide();
              },
              error: function() {
              },
            });
        }
        
        var lastUpdateTime = new Date().getTime();
        
        /* update the query table lazily, 'absorbing' calls that are close in time to reduce number of API calls */
        var updateQuery = function() {
            var now = new Date().getTime();
            if (now - lastUpdateTime < 390) return;
            lastUpdateTime = now;
            setTimeout(function(){
                var now = new Date().getTime();
                var diff = now - lastUpdateTime;
                if (diff >= 499.999) {
                    _updateQuery(500);
                }
            }, 500);
        }
        
        // set up autocomplete
        $.get(BreakthroughAPI.targets_api_url, function(targetsList) {
            // fetch list of targets first
            var autoCompleteList = [], autoCompleteTrie = new AutoCompleteTrie();
            for (var key in targetsList) {
                for (var i = 0; i < targetsList[key].length; i++) {
                    autoCompleteTrie.insert(targetsList[key][i], autoCompleteList.length);
                    autoCompleteList.push({ value: targetsList[key][i], data: key });
                }
            }
            targets = targetsList;
            
            queryBox.autocomplete({
                lookupLimit: 25,
                onSelect: function (suggestion) {
                    queryBox[0].value = suggestion['data']
                    updateQuery();
                },
                lookup: function(request, response) {        
                    // custom lookup function to allow lookup of objects using alternative names
                    var suggest = [];
                    var queryStr = query.value.toLowerCase();
                    var prefix = '';
                    if (queryStr.length > 0 && (queryStr[0] == '!' || queryStr[0] == '/')) {
                        prefix = queryStr[0];
                        queryStr = queryStr.substr(1);
                    }
                    var matches = autoCompleteTrie.query(queryStr);
                    for (var j = 0; j < matches.length; j++) {
                        var i = matches[j];
                        if (autoCompleteList[i]['value'].toLowerCase().indexOf(queryStr) > -1) {
                            if (autoCompleteList[i].value == autoCompleteList[i].data) {
                                suggest.push({ value: autoCompleteList[i].value, data : prefix + autoCompleteList[i].data });
                            } else {
                                // for alt names, add reference to canonical name
                                suggest.push({ value: autoCompleteList[i].value + " \u2192 " + autoCompleteList[i].data, data : prefix + autoCompleteList[i].data });
                            }
                            if (suggest.length >= 100) break;
                        }
                    }
                    
                    // display the filtered results
                    response({ suggestions: suggest });
                }
            });
        });
        
        $("input[type='number']").inputSpinner({
            buttonsWidth: "1.5rem",
            groupClass: "input-group-sm time-group",
            buttonsClass: "btn-faint-border",
        });
        
        
        // if any option is modified, reload
        $('#search-options').find("input[type='checkbox']").change(function() {
            updateQuery();
        });
        $('#search-options').find("input[type='number']").on("change", function (event) {
            updateQuery();
        })
        
        queryBox.on('keyup', function(event) {
            updateQuery();
        });   
    
        celestialNeedUpdate = true;
        $("#celestial-card .card-header").click(function() {
            if (!$('#celestial-panel').hasClass('show')) {
                if (celestialNeedUpdate) {
                    setTimeout(function() {
                        Celestial.rotate({ center : celestialCenterPos });
                        updateCelestial();
                    }, 500);
                }
            }
        });
        
        // handle table row click (show more info about data file)
          $('#results-table tbody').on('click', 'tr', function () {
            var flbox = $('#fl-box-inner');
            var flhtml = "";
            var $this = $(this);
            var tds = $this.find('td');
            flhtml += "<table class=\"table\"><thead><tr><th colspan=2>" + tds[3].innerText + "</th></tr></thead><tbody>";
            if (tds[3].innerText in targets) {
                flhtml += "<tr><td>Alt Identifiers (From SIMBAD):</td><td>" + targets[tds[3].innerText].join(',  ') + "</td></tr>";
            }
            flhtml += "<tr><td>Time (UTC):</td><td>" + tds[0].innerText + "</td></tr>";
            flhtml += "<tr><td>Time (<acronym title=\"Modified Julian Date (days since midnight, November 17, 1858)\">MJD</acronym>):</td><td>" + tds[1].innerText + "</td></tr>";
            flhtml += "<tr><td>Telescope:</td><td>" + tds[2].innerText + "</td></tr>";
            flhtml += "<tr><td>RA (&deg;):</td><td>" + tds[4].innerText + "</td></tr>";
            var ra = parseFloat(tds[4].innerText) / 15.0;
            var raH = Math.floor(ra);
            var raM = Math.floor((ra - raH) * 60.);
            var raS = (ra - raH - raM / 60.) * 3600.;
            flhtml += "<tr><td>RA (h:m:s):</td><td>" + raH + ":" + raM + ":" + raS + "</td></tr>";
            flhtml += "<tr><td>Declination (&deg;):</td><td>" + tds[5].innerText + "</td></tr>";
            flhtml += "<tr><td>Center Freq (MHz):</td><td>" + tds[6].innerText + "</td></tr>";
            flhtml += "<tr><td>File Type:</td><td>" + tds[7].innerText + "</td></tr>";
            flhtml += "<tr><td>File Size:</td><td>" + tds[8].innerText + "</td></tr>";
            var link = tds[9].innerHTML;
            link = link.substr(link.indexOf("href") + 6);
            link = link.substr(0, link.indexOf("\""));
            var md5 = tds[9].innerHTML;
            md5 = md5.substr(md5.indexOf("MD5Sum: ") + 8);
            md5 = md5.substr(0, md5.indexOf("\""));
            
            flhtml += "<tr><td>Download:</td><td><a href=\"" + link + "\">" + link + "</a></td></tr>";
            flhtml += "<tr><td>MD5 Sum:</td><td>" + md5 + "</td></tr>";
            flhtml += "<tr><td>SIMBAD Query (If Applicable):</td><td><a href=\"http://simbad.u-strasbg.fr/simbad/sim-id?protocol=html&Ident=" + tds[3].innerText + "\" target=\"_blank\">" + tds[3].innerText + "</td></tr>";
            flhtml += "</tbody></table>";
            flbox.html(flhtml);
            
            var flboxOuter = $('#fl-box');
            $.featherlight(flboxOuter);
          } ); // click
          // prevent row click handler from affecting download link
          $('#results-table tbody').on('click', 'tr td a', function (e) {
              e.stopPropagation();
          });
          $('#results-table tbody').on('click', 'tr td a i', function (e) {
              e.stopPropagation();
          });

        queryBox.focus();
}); //ready
