# Changelog

## Testing Version Specific Features:
* Live version is up to Date.
#### Bug Fixes:
* Fixed a bug where cadenceUrls are generated incorrectly by get-cadence-url and query-files.

## Version 2.0 (04/26/21):
### New Features:
#### Misc:
* Created this changelog. 
* Created a quality system to grade scan quality, currently it is based on how hot the system was compared to a target temperature for each band.
* Created a process.py file which processes all the data stored in the database as well as querying the redis database for temperature information. This enables quality searches and the tempX and tempY keys to get populated, while also enabling a 1000x+ speedup of cadence searches.
* Modified postion search such that if only "pos-rad" is passed in, but "pos-dec", "pos-ra" are not, then as long as "target" is an actual target in the database it will perform a postion search as if target = "" and pos-ra and pos-dec are set to the ra and dec of the target entered. 
* Expanded the ReadMe to include documenting the various features of the Backend-API (and to a lesser extent the frontend website), rather than simply documenting the steps needed to get the flask-API up and running.
#### API Features:
* Added "/api/get-cadence-url" which takes in the id of a scan and returns a "cadenceUrl" (a url corresponding the the getCadence API call below) or "Unknown" if no cadence is found.
* Added "/api/get-cadence/<string:cadence_url>" which takes in the id of the "head" of a cadence as well as a set of filters and returns a Json containing all the stored information corresponding to all the entries of the cadence matching the filter. This method isn't meant to be called directly but rather meant to be called using the cadenceURLs found above.
* Added "/api/get-diagnostic-sources/<string:diagnosticType>/<string:id>" which takes in a diagnosticType (Pulsar or Calibrator) as well as an id corresponding to a specific scan and returns all of the Pulsars or Calibrators scanned within 12 hours of that scan
* Added "/api/get-Temp/" which takes in an id corresponding to a scan and returns the best known system Temperature at the time of the time of that scan if available.
* Added "/api/list-grades" which lists out a list of possible "grade" inputs for use with the "grade" keyword in query-files.
* Added "/api/list-quality" which lists out a list of possible "quality" inputs for use with the "quality" keyword in query-files.
#### Query Keywords:
* Added "cadence" which is a boolean that when true performs cadence specific searches to GBT and selected Parkes data, which searches the database for targets looked at in the form ABACAD.
* Added "grades" which takes in a list and filters HDF5 and Fits files to only include files of the same "grade" (mid, fine, time)
* Added "primaryTarget" which is a boolean that when set true along with cadence causes the cadence to only look for targets where the search-target is the A target in the cadence (rather than any entry in it)
* Added "minSize" which specifies a minimum size the corresponding download files returned should be in GB.
* Added "maxSize" which specifies a maximum size the corresponding download files returned should be in GB.
* Added "Quality" which takes in a list and filters the output based on its assigned Quality Grade. 
#### Query Json Entry Keys:
* Added "cadence_url" which returns the cadenceUrl corresponding to a given cadence when cadence is set to True
* Added "tempX" which gives the tempX of the system at the time of the scan if known or "Unknown" otherwise (only available for recent GBT data)
* Added "tempY" which gives the tempY of the system at the time of the scan if known or "Unknown" otherwise (only avaialbe for recent GBT data)
#### Front End Features:
* Created a test version of the website hosted on http://35.236.84.6:5001/ to test new changes without breaking the original architecture
* Added the "Data Type" column under Advanced Search Options corresponding to the "grades" keyword in the query-files API. 
* Added the "Quality" column under Advanced Search Options corresponding to the "quality" keyword in the query-files API.
* Added "Cadence" column under Advanced Search Options containing two boolean options, "On" and "Primary Target" corresponding to the "cadence" and "primaryTarget" keywords for query-file
* Added a "Search Around This Target" button that can only checked when the target in the search bar corresponds to a target in the database, which will cause Position Search to become enabled and the Right Ascension as well as Declination of the target are copied into the Center Declination and Center Right Acension sections of the Position Search (and the target is set to "" for filtering purposes).
* Added a "Quality" column to the data-response table corresponding to the "quality" key in the query-files API return json entries. 
* Added a Pulsar and Calibrator section to the filldown menu generated when a user clicks on an entry in the table, any associated Pulsars and Calibrators will be listed there with their corresponding download links.
* Added a Tsys section to the filldown menu generated when a user clicks on an entry in the table, the tempX and tempY corresponding to the scan will be listed in comma seperated format. 
* Created an expanded filldown menu when the search is a cadence search, which includes a Cadence URL sectiona s well as a breakdown of the downloads section into different sections for each file type (and grade), which list the names of the targets and their downloads in the ABACAD order if possible. 
### Changes:
#### Misc:
* Numerous unlisted changes over the course of development.
* Made changes to minimize the amount of code changes needed to host the server in a new location
#### Frontend:
* Changed the url section of the data-response table to be the cadence-url rather than a normal download url in the event that cadence is marked true.
### Bug Fixes:
#### Misc:
* Numerous unlisted fixes over the course of development.
* Fixed issues with position search where it wouldn't always work as intended, espcially near the "poles". 
### Removed Features:
## Version 1.0 (05/02/20):
  Initial fork from master.
  
