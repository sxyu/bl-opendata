const openDataAPI = "http://35.236.84.6:5001/api/";
const TELESCOPES = ["gbt","parkes","apf"];
const FILETYPES = ["fil","hdf5","baseband","fits"];
const DATATYPES = ["fine","mid","time"];
const QUALITIES = ['A','B','C','F',"Ungraded"];
$(document).ready(function(){
        /*-- Celestial initialization --*/
        /* D3-Celestial sky map, copyright 2015 Olaf Frohn https://github.com/ofrohn */
        /* create a default Celestial config object, with parent object ID 'containerName' */
        var urlToID = {};
        //var openDataAPI = "http://seti.berkeley.edu/opendata/api/" Uncomment Me and comment out above line
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
              container: containerName,   // ID of parent element
              datapath: "data/",  // Path/URL to data files
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
              }, // stars
              dsos: {
                show: true,
                limit: 5,
                names: true,
                desig: true,
                namelimit: 3.5,
                namestyle: { fill: "#aaaaaa", font: '9px Roboto, "Helvetica Neue", Arial, sans-serif', align: "left", baseline: "top" },
                size: null,
                exponent: 1.4,
                data: 'dsos.bright.json',
                symbols: {
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
              }, // dsos
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
          }; // return object
        }; // getCelestialConfig
        var entries = {} //Hoping initialization works the way I think it does
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
                celestialNeedUpdate = true;
            }
        } // addObjsToCelestial

        updateCelestial();

        let trueString = function(str){
          return str && (str=="1" || str=="True" || str=="str");
        }


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


            // // Data types
            var fineData = $('#data-fine')[0].checked;
            var midData= $('#data-mid')[0].checked;
            var timeData = $('#data-time')[0].checked;
            if(!(fineData && midData && timeData)){
                dataStr = "";
                if (fineData) dataStr += "fine,";
                if (midData) dataStr += "mid,";
                if (timeData) dataStr += "time,";
                if (dataStr.length == 0) {
                    showError("Please select at least one data Type.");
                    return;
                }
                data['grades'] = dataStr.substr(0,dataStr.length-1);
            }

            // // Data types
            var qualityA = $('#quality-A')[0].checked;
            var qualityB = $('#quality-B')[0].checked;
            var qualityC = $('#quality-C')[0].checked;
            var qualityF = $('#quality-F')[0].checked;
            var qualityUngraded = $('#quality-Ungraded')[0].checked;
            if(!(qualityA && qualityB && qualityC && qualityF && qualityUngraded)){
                qualStr = "";
                if (qualityA) qualStr += "A,";
                if (qualityB) qualStr += "B,";
                if (qualityC) qualStr += "C,";
                if (qualityF) qualStr += "F,";
                if (qualityUngraded) qualStr += "Ungraded,";
                if (qualStr.length == 0) {
                    showError("Please select at least one quality level.");
                    return;
                }
                data['quality'] = qualStr.substr(0,qualStr.length-1);
            }


            var cadence = $('#cadence-on')[0].checked;
            if(cadence){
                data['cadence']='True';
                document.getElementById("primaryTarget").disabled = false;
            }else{
              document.getElementById("primaryTarget").disabled = true;
              document.getElementById("primaryTarget").checked = false;
            }
            var primaryTarget = $('#primaryTarget')[0].checked;
            if(primaryTarget){
              data['primaryTarget'] = 'True';
            }
            // position
            var posEnabled = $('#pos-enable')[0].checked;
            var targetCentered = $('#targetCentered')[0].checked;
            if (posEnabled || targetCentered) {
                var posRA = $('#pos-ra').val();
                var posDec = $('#pos-decl').val();
                var posRad = $('#pos-rad').val();
                data['pos-rad'] = parseFloat(posRad);
                if(!targetCentered){
                  data['pos-ra'] = parseFloat(posRA);
                  data['pos-dec'] = parseFloat(posDec);
                }
            }
            if(targetCentered){
              var searchRequest = {};
              searchRequest['target'] = "!" + data['target']
              searchRequest['limit']=1
              $.ajax({
                dataType: "json",
                url: openDataAPI+ "query-files",
                data: searchRequest,
                success: function(result) {
                    if (result['result'] != "success") {
                        showError(result['message']);
                        return;
                    }
                    //WARNING: This code is more ordering dependent than I like, so future changes has a chance to cause an issue with the indexing.
                    var entries = result['data'];
                    let ra = entries[0]['ra'];
                    let decl = entries[0]['decl'];
                    document.getElementsByClassName("form-control")[1].value = ra;
                    document.getElementsByClassName("form-control")[2].value = decl;
                    document.getElementById("pos-ra").value = ra;
                    document.getElementById("pos-decl").value = decl;
                    document.getElementById("pos-enable").checked = true;
                },
                error: function() {
                },
              });
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

            let paperName = $('#paper-name').val();
            if (paperName != 'none'){
              data['paperName'] = paperName
            }
            if (lim > 0) {
                data['limit'] = lim;
            }

            // call API to get new data
            $.ajax({
              dataType: "json",
              url: openDataAPI+ "query-files",
              data: data,
              success: function(result) {
                  if (result['result'] != "success") {
                      showError(result['message']);
                      return;
                  }
                  // update the datatable
                  dataTable.clear();
                  entries = result['data'];
                  for (var i = 0; i < entries.length; i++) {
                    var date = new Date(entries[i]['utc']);
                    var ftype = entries[i]['file_type'];
                    var dateTimeOptions = { timeZone:'UTC' };
                    urlName = 'url'
                    if(cadence){
                        urlName = 'cadence_url'
                    }
                    urlToID[entries[i][urlName]] = entries[i]['id']
                    dataTable.row.add([
                        date.toLocaleDateString('en-GB', dateTimeOptions) + " " + date.toLocaleTimeString('en-GB', dateTimeOptions),
                        Math.round(entries[i]['mjd'] * PRECISION) / PRECISION,
                        entries[i]['telescope'],
                        entries[i]['target'],
                        Math.round(entries[i]['ra'] * PRECISION) / PRECISION,
                        Math.round(entries[i]['decl'] * PRECISION) / PRECISION,
                        Math.round(entries[i]['center_freq'] * PRECISION) / PRECISION,
                        ftype,
                        _humanFileSize(entries[i]['size'], false),
                        entries[i]['quality'],
                        '<a class="download-link" href="'+entries[i][urlName]+'" title="MD5Sum: ' + entries[i]['md5sum'] + '"><i class="fas fa-cloud-download-alt"></i></a>',
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

        let initializeSearchOptions = function(){
          let params = new URL(window.location.href).searchParams;




            let target = params.get("target");
            if (target){
              $('#query').val(target);
            }

            let targetCentered = params.get("targetCentered"); //TODO: Improve the behavior of targetCentered to only work in a valid situation
            if (trueString(targetCentered)){
              $("#targetCentered").prop("checked",true);
            }

            let telescopes = JSON.parse(params.get("telescopes"));
            if (telescopes){
              for (const teleName of TELESCOPES){
                $("#telescope-"+teleName).prop("checked", false);
              }
              for (const teleName of telescopes){
                $("#telescope-"+teleName).prop("checked", true);
              }
            }

            let fileTypes = JSON.parse(params.get("fileTypes"));
            if (fileTypes){
              for (const fileType of FILETYPES){
                $("#ftype-"+fileType).prop("checked", false);
              }
              for (const fileType of fileTypes){
                $("#ftype-"+fileType).prop("checked", true);
              }
            }

            let dataTypes = JSON.parse(params.get("dataTypes"));
            if (dataTypes){
              for (const name of DATATYPES){
                $("#data-"+name).prop("checked", false);
              }
              for (const name of dataTypes){
                $("#data-"+name).prop("checked", true);
              }
            }

            let qualities = JSON.parse(params.get("qualities"));
            if (qualities){
              for (const name of QUALITIES){
                $("#quality-"+name).prop("checked", false);
              }
              for (const name of qualities){
                $("#quality-"+name).prop("checked", true);
              }
            }

            let cadence = params.get("cadence");
            if (trueString(cadence)){
              $("#cadence-on").prop("checked",true);
              let primaryTarget = params.get("primaryTarget");
              if (trueString(primaryTarget)){
                $("#primaryTarget").prop("checked",true);
                $("#primaryTarget").prop("disabled",false);
              }
            }

            let posSearch = params.get("posSearch");
            if (trueString(posSearch)){
              $('#pos-enable').prop("checked",true)

              let ra = params.get("posRa");
              if (ra){
                ra = parseFloat(ra);
                $('#pos-ra').val(ra);
              }

              let dec = params.get("posDecl");
              if (dec){
                dec = parseFloat(dec);
                $('#pos-decl').val(dec);
              }

              let rad = params.get("posRadius");
              if (rad){
                rad = parseFloat(rad);
                $('#pos-rad').val(rad);
              }
            }

            let startTime = params.get("startTime");
            if (startTime){
              startTime = parseFloat(startTime);
              $('#time-start').val(startTime);
            }

            let endTime = params.get("endTime");
            if (endTime){
              endTime = parseFloat(endTime);
              $('#time-end').val(endTime);
            }

            let startFreq = params.get("startFreq");
            if (startFreq){
              startFreq = parseFloat(startFreq);
              $('#freq-start').val(startFreq);
            }

            let endFreq = params.get("endFreq");
            if (endFreq){
              endFreq = parseFloat(endFreq);
              $('#freq-end').val(endFreq);
            }

            $.get(openDataAPI+ "list-papers",
              function(paperNames) {
                  console.log(paperNames)
                  paperNames.forEach(paper =>
                    $('#paper-name').append(`<option value="`+paper+`">`+paper+`</option>`)
                  )
                  let paper = params.get("paperName");
                  if (paper){
                    $('#paper-name').val(paper);
                    if (  $('#paper-name').val()!=paper){
                      $('#paper-name').val('none');
                    }
                  }
                  let onload = params.get("onLoad");
                  if (trueString(onload)){
                    _updateQuery(500);
                  }
              });




        }
        initializeSearchOptions();
        // set up autocomplete
        $.get(openDataAPI+"list-targets?simbad", function(targetsList) {
            // fetch list of targets first
            var autoCompleteList = [], autoCompleteTrie = new AutoCompleteTrie();
            for (var key in targetsList) {
                for (var i = 0; i < targetsList[key].length; i++) {
                    autoCompleteTrie.insert(targetsList[key][i], autoCompleteList.length);
                    autoCompleteList.push({ value: targetsList[key][i], data: key });
                }
            }
            targets = targetsList;
            var targetName = query.value.toLowerCase();

            queryBox.autocomplete({
                onSelect: function (suggestion) {
                    queryBox[0].value = suggestion['data']
                    updateQuery();
                },
                lookup: function(request, response) {
                    // custom lookup function to allow lookup of objects using alternative identifiers
                    var suggest = [];
                    if (query.value.length == 0) {
                        response({ suggestions: [] });
                    }
                    var queryStr = query.value.toLowerCase();
                    var prefix = '';
                    if (queryStr.length > 0 && (queryStr[0] == '!' || queryStr[0] == '/')) {
                        prefix = queryStr[0];
                        queryStr = queryStr.substr(1);
                    }
                    var matches = autoCompleteTrie.query(queryStr);
                    if(matches.length >0 && autoCompleteList[matches[0]]['value'].toLowerCase() == queryStr){
                      document.getElementById("targetCentered").disabled = false;
                    }else{
                      document.getElementById("targetCentered").disabled = true;
                      document.getElementById("targetCentered").checked = false;
                    }
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
                },
                beforeRender : function(container, suggestions) {
                    var eles = $(container).find(".autocomplete-suggestion");
                    // remove highlight from right side of arrow (canonical id for alt id)
                    for (var i = 0; i < eles.length; i++) {
                        var htm = eles[i].innerHTML;
                        var spl = htm.split("\u2192");
                        if (spl.length == 2) {
                            spl[1] = spl[1].replace(new RegExp('(<strong>|</strong>)', 'g'), '');
                            htm = spl[0] + "\u2192" + spl[1];
                            $(eles[i]).html(htm);
                        }
                    }
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
        document.getElementById('targetCentered').onchange=_updateQuery;
        $('#search-options').find("input[type='number']").on("change", function (event) {
            updateQuery();
        })

        $('#search-options').find("select").on("change", function (event) {
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
          var cadence = $('#cadence-on')[0].checked;
          if(cadence){
            flhtml += "<table class=\"table\"><thead><tr><th colspan=2>" + "Primary Target: " + tds[3].innerText + "</th></tr></thead><tbody>";
          }
          else{
            flhtml += "<table class=\"table\"><thead><tr><th colspan=2>" + "Target: " + tds[3].innerText + "</th></tr></thead><tbody>";
          }
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
          flhtml += "<tr><td>RA (h:m:s):</td><td>" + raH + ":" + raM + ":" + raS.toFixed(1) + "</td></tr>";
          flhtml += "<tr><td>Declination (&deg;):</td><td>" + tds[5].innerText + "</td></tr>";
          flhtml += "<tr><td>Center Freq (MHz):</td><td>" + tds[6].innerText + "</td></tr>";
          if(!cadence){
            flhtml += "<tr><td>File Type:</td><td>" + tds[7].innerText + "</td></tr>";
            flhtml += "<tr><td>File Size:</td><td>" + tds[8].innerText + "</td></tr>";
          }

          var link = tds[10].innerHTML;
          link = link.substr(link.indexOf("href") + 6);
          link = link.substr(0, link.indexOf("\""));
          var md5 = tds[10].innerHTML;
          md5 = md5.substr(md5.indexOf("MD5Sum: ") + 8);
          md5 = md5.substr(0, md5.indexOf("\""));
          //insert temp stuff here
          //flhtml += "<tr><td>Temperature:</td><td>" + entries[i]['tempX'] + "</td></tr>";

              //Handle finding information about cadence
          //let tempGet = openDataAPI + "get-Temp/"+tds[1].innerText +"/"+tds[6].innerText;
          let tempGet = openDataAPI + "get-Temp/"
          let tempRequest = {"id":urlToID[link]}
          $.ajax({
            dataType: "json",
            type: "GET",
            url: tempGet,
            data: tempRequest,
            async:false,
            success: function(result){
              flhtml+="<tr><td>Tsys (K):</td><td>" + result['tempX'] + ", " + result['tempY'] + "</td></tr>";
            },
            error: function(){
              flhtml+="<tr><td>Tsys (K):</td><td> Unknown, Unknown </td></tr>";
            }
          })
          if(cadence){
            flhtml += "<tr><td>Cadence:</td><td><a href=\"" + link + "\">" + link + "</a></td></tr>";
            $.ajax({
              dataType: "json",
              type:"GET",
              url: link,
              async: false,
              success: function(result) {
                  if (result['result'] != "success") {
                      showError(result['message']);
                      return;
                  }
                  // update the datatable
                  var entries = result['data'];
                  var fine =[]
                  var time =[]
                  var mid =[]
                  var raw =[]
                  let targets = new Set()
                  if(entries.length>0){
                    // flhtml += "<tr><td>Downloads:</td><td>";
                    for (var i = 0; i < entries.length; i++) {
                        //flhtml+="<a href=\"" + entries[i]['url']+ "\">" + entries[i]['target'] + ", </a>";
                        var entry = entries[i]
                        targets.add(entry['target'])
                        if (entry['file_type'] != 'HDF5'){
                          raw.push(entry)
                        }
                        else{
                          var split = entry['url'].split('.')
                          split = split[split.length-2].split('_')
                          var end = split[split.length-1]
                          if (end == 'fine'){
                            fine.push(entry)
                          }
                          else if (end =='mid'){
                            mid.push(entry)
                          }
                          else{
                            time.push(entry)
                          }
                        }
                    }

                    if (fine.length>0){
                      flhtml += "<tr><td>Downloads(Fine):</td><td>";
                      for(var i=0;i<fine.length;i++){
                        if(i<fine.length-1){
                          flhtml+="<a href=\"" + fine[i]['url']+ "\">" + fine[i]['target'] + ", </a>";
                        }
                        else{
                          flhtml+="<a href=\"" + fine[i]['url']+ "\">" + fine[i]['target'] + "</a>";
                        }
                      }
                      flhtml+="</td></tr>";
                    }
                    if (mid.length>0){
                      flhtml += "<tr><td>Downloads(Mid):</td><td>";
                      for(var i=0;i<mid.length;i++){
                        if(i<mid.length-1){
                          flhtml+="<a href=\"" + mid[i]['url']+ "\">" + mid[i]['target'] + ", </a>";
                        }
                        else{
                          flhtml+="<a href=\"" + mid[i]['url']+ "\">" + mid[i]['target'] + "</a>";
                        }
                      }
                      flhtml+="</td></tr>";
                    }
                    if (time.length>0){
                      flhtml += "<tr><td>Downloads(Time):</td><td>";
                      for(var i=0;i<time.length;i++){
                        if(i<time.length-1){
                          flhtml+="<a href=\"" + time[i]['url']+ "\">" + time[i]['target'] + ", </a>";
                        } else{
                          flhtml+="<a href=\"" + time[i]['url']+ "\">" + time[i]['target'] + "</a>";
                        }
                      }
                      flhtml+="</td></tr>";
                    }
                    if (raw.length>0){
                      flhtml += "<tr><td>Downloads(Raw):</td><td>";
                      for(var i=0;i<raw.length;i++){
                        if(i<raw.length-1){
                          flhtml+="<a href=\"" + raw[i]['url']+ "\">" + raw[i]['target'] + ", </a>";
                        } else{
                          flhtml+="<a href=\"" + raw[i]['url']+ "\">" + raw[i]['target'] + "</a>";
                        }
                      }
                      flhtml+="</td></tr>";
                    }

                  flhtml += "<tr><td>MD5 Sum:</td><td>" + md5 + "</td></tr>";
                  //Handling Simbad Query
                  flhtml += "<tr><td>SIMBAD Query (If Applicable):</td><td>"
                  for (let target of targets){
                    flhtml+="<a href=\"http://simbad.u-strasbg.fr/simbad/sim-id?protocol=html&Ident=" + target + "\" target=\"_blank\">" + target + " </a>";
                  }
                  flhtml+= "</td></tr>"
                  } else{
                    flhtml += "<tr><td>MD5 Sum:</td><td>" + md5 + "</td></tr>";
                    flhtml += "<tr><td>SIMBAD Query (If Applicable):</td><td><a href=\"http://simbad.u-strasbg.fr/simbad/sim-id?protocol=html&Ident=" + tds[3].innerText + "\" target=\"_blank\">" + tds[3].innerText + "</td></tr>";
                  }
              },
              error: function() {
                flhtml += "<tr><td>Downloads:</td><td><a href=\"" + link+ "\">" + 'error '+ "</a></td></tr>";
                flhtml += "<tr><td>MD5 Sum:</td><td>" + md5 + "</td></tr>";
                flhtml += "<tr><td>SIMBAD Query (If Applicable):</td><td><a href=\"http://simbad.u-strasbg.fr/simbad/sim-id?protocol=html&Ident=" + tds[3].innerText + "\" target=\"_blank\">" + tds[3].innerText + "</td></tr>";
                flhtml += "</tbody></table>";
                flbox.html(flhtml);
              },
              complete : function () {}
        });}
        else{
          flhtml += "<tr><td>Download:</td><td><a href=\"" + link + "\">" + link + "</a></td></tr>";
          flhtml += "<tr><td>MD5 Sum:</td><td>" + md5 + "</td></tr>";
          flhtml += "<tr><td>SIMBAD Query (If Applicable):</td><td><a href=\"http://simbad.u-strasbg.fr/simbad/sim-id?protocol=html&Ident=" + tds[3].innerText + "\" target=\"_blank\">" + tds[3].innerText + "</td></tr>";
        }

        let diagLink = openDataAPI + "get-diagnostic-sources/Pulsar/" + urlToID[link]
        $.ajax({
          dataType: "json",
          type:"GET",
          url: diagLink ,
          async:false,
          success: function(result) {
            if(result['result']=='success'){
              let names = result['names']
              let urls = result['urls']
              if(names.length>0){
                flhtml += "<tr><td>Pulsars: </td><td>";
                for(let i=0;i<names.length;i++){
                  if(i<names.length-1){
                    flhtml += "<a href=\"" + urls[i]+ "\">" + names[i]+ ", </a>";
                  }
                  else{
                    flhtml += "<a href=\"" + urls[i]+ "\">" + names[i]+ "</a>";
                  }

                }
                flhtml += "</td></tr>"
              }
            }
          },
          complete: function(){}
        });

        diagLink = openDataAPI + "get-diagnostic-sources/Calibrator/" + urlToID[link]
        $.ajax({
          dataType: "json",
          type:"GET",
          url: diagLink ,
          async:false,
          success: function(result) {
            if(result['result']=='success'){
              let names = result['names']
              let urls = result['urls']

              if(names.length>0){
                flhtml += "<tr><td>Calibrators: </td><td>";
                for(let i=0;i<names.length;i++){
                  if(i<names.length-1){
                    flhtml += "<a href=\"" + urls[i]+ "\">" + names[i]+ ", </a>";
                  }
                  else{
                    flhtml += "<a href=\"" + urls[i]+ "\">" + names[i]+ "</a>";
                  }
                }
                flhtml += "</td></tr>"
                }
              }
          },
          complete: function(){
            flhtml += "</tbody></table>";
            flbox.html(flhtml);
          }
        });

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
function saveUrl(){
  let savedUrl = openDataAPI.substring(0,openDataAPI.length-4) + "?onLoad=1";
  let target  = $('#query').val();
  if(target){
    savedUrl += "&target="+target;
  }

  var telGBT = $('#telescope-gbt')[0].checked;
  var telParkes = $('#telescope-parkes')[0].checked;
  var telAPF = $('#telescope-apf')[0].checked;
  if (!(telGBT && telParkes && telAPF)) {
      let telescopes = [];
      if (telGBT) telescopes.push("gbt");
      if (telParkes) telescopes.push("parkes");
      if (telAPF) telescopes.push("apf");
      if (telescopes.length >0){
        savedUrl += "&telescopes=" +JSON.stringify(telescopes);
      }

  }

  // file types
  var ftypeFil = $('#ftype-fil')[0].checked;
  var ftypeHDF5 = $('#ftype-hdf5')[0].checked;
  var ftypeBaseband = $('#ftype-baseband')[0].checked;
  var ftypeFITS = $('#ftype-fits')[0].checked;
  if (!(ftypeFil && ftypeHDF5 && ftypeBaseband && ftypeFITS)) {
      let ftypes = [];
      if (ftypeFil) ftypes.push("filterbank");
      if (ftypeHDF5) ftypes.push("hdf5");
      if (ftypeBaseband) ftypes.push("baseband data");
      if (ftypeFITS) ftypes.push("fits");
      if (ftypes.length > 0) {
        savedUrl += "&fileTypes=" +JSON.stringify(ftypes);
      }
  }


  // // Data types
  var fineData = $('#data-fine')[0].checked;
  var midData= $('#data-mid')[0].checked;
  var timeData = $('#data-time')[0].checked;
  if(!(fineData && midData && timeData)){
      let dataTypes = [];
      if (fineData) dataTypes.push("fine");
      if (midData) dataTypes.push("mid");
      if (timeData) dataTypes.push("time");
      if (dataTypes.length > 0) {
        savedUrl += "&dataTypes=" + JSON.stringify(dataTypes)
      }
  }

  // Quality
  var qualityA = $('#quality-A')[0].checked;
  var qualityB = $('#quality-B')[0].checked;
  var qualityC = $('#quality-C')[0].checked;
  var qualityF = $('#quality-F')[0].checked;
  var qualityUngraded = $('#quality-Ungraded')[0].checked;
  if(!(qualityA && qualityB && qualityC && qualityF && qualityUngraded)){
      let qualities = [];
      if (qualityA) qualities.push("A");
      if (qualityB) qualities.push("B");
      if (qualityC) qualities.push("C");
      if (qualityF) qualities.push("F");
      if (qualityUngraded) qualities.push("Ungraded");
      if (qualities.length > 0) {
        savedUrl +="&qualities="+JSON.stringify(qualities);
      }
  }


  var cadence = $('#cadence-on')[0].checked;
  if(cadence){
      savedUrl +="&cadence=1";
      let primaryTarget = $('#primaryTarget')[0].checked;
      if(primaryTarget){
        savedUrl += "&primaryTarget=1";
      }
  }

  // position
  var posEnabled = $('#pos-enable')[0].checked;
  if (posEnabled ) {
      var posRA = $('#pos-ra').val();
      var posDec = $('#pos-decl').val();
      var posRad = $('#pos-rad').val();
      savedUrl += "*posSearch=1&posRa="+posRA +"&posDecl="+posDec+"&posRadius="+posRad;
  }
  var targetCentered = $('#targetCentered')[0].checked;
  if(targetCentered){
    savedUrl += "&targetCentered=1";
  }

  // time
  var timeStart = parseFloat($('#time-start').val());
  var timeEnd = parseFloat($('#time-end').val());
  if (timeStart > parseFloat($('#time-start')[0].min) || timeEnd < parseFloat($('#time-end')[0].max)) {
      savedUrl+="&startTime="+timeStart +"&endTime="+timeEnd;
  }


  // freq
  var freqStart = parseFloat($('#freq-start').val());
  var freqEnd = parseFloat($('#freq-end').val());
  if (freqStart > parseFloat($('#freq-start')[0].min) || freqEnd < parseFloat($('#freq-end')[0].max)) {
      savedUrl+="&startFreq="+timeStart +"&endFreq="+timeEnd;
  }

  let paperName = $('#paper-name').val();
  if (paperName != 'none'){
    savedUrl += "&paperName="+ paperName;
  }
  // navigator.clipboard.writeText(savedUrl);
  // alert("Url: " + savedUrl);
  $("#url-modal-body").html("<p>"+savedUrl+"</p>");
  $("#url-modal").modal('show');
}
