# Breakthrough Listen Open Data Archive

- Based on Flask, MySQL
- `pip install -r requirements.txt` to get all dependencies
- Credit for the base code and features to https://github.com/sxyu/bl-opendata.

- Instructions
  - After installing the dependencies use call python3 run.py to run the program, make sure that you have a port forwarded for the website to work
  - There are two components to this program, the openData website and the backend API which are detailed below
  - Url for both website and API calls: http://35.236.84.6:5001/
  
- API
  - The method descriptions are present as docstrings within core.py. A list of possible API requests: 
    - data/<path:filename>
    - api/list-targets
      - returns a json containing a list of all targets in the database at this time.
    - api/list-telescopes
      - returns a json containing a list of all telescopes in the database at this time.
    - api/list-file-types
      - returns a json containing a list of all file type names in the database at this time.
    - api/query-files
      - main method you will use, its use is detailed below
    - api/get-cadence-url
      - Arguments:
        - 'url': url location of the file in the open database
       - Return Json:
        - 'result': either success or error
        - 'url': a url corresponding to the 'cadence url' of the entry, this url will call the get-cadence method below for the correct cadence
    - api/get-cadence/<string:cadence_url>
      - Return Json:
        - 'result': either success or error
        - 'data': list of dictionaries, each with keys: 'target','target', 'telescope', 'utc', 'mjd', 'ra',
                                          'decl', 'center_freq', 'file_type', 'size', 'md5sum', 'url', 'tempX', 'tempY', 'minSize', 'maxSize'
    - api/get-diagnostic-sources/<string:diagnosticType>/<string:id>
      - Input: diagnosticType should either be Pulsar or Calibrator, id should be the id number of an observation
      - Return Json:
        - 'result': either success or error
        - 'names': A list of the calibrators or pulsars (depending what was searched for) that were targeted within 12 hours of this search id
        - 'urls': Corresponding download url's to the name list above.
      
  - Query Files method details:
    - Argument List: target (required), telescopes (comma-sep), file-types (comma-sep), pos-ra , pos-dec, pos-rad, time-start (mjd), time-end (mjd), freq-start, freq-end, limit, cadence (boolean), grades (comma-sep), quality (comma-sep), minSize (GB), maxSize (GB)
      - target: The api will return all things containing the target string within the name, so if you set target to "" all targets will be returned, and if you set it to "HIP" only HIP targets will remain.
      - Filtering: telescopes, file-types, quality and grades are all enum's that are used to filter the data (grades only filters Hdf5 and filterbank data), the apropriate entry options can be gotten using the list-"" api calls above. 
      - Position search: pos-ra, pos-dec, pos-rad only make sense if either all are used or none are used (Exception Below): pos-ra is the center right ascension in degrees a        and pos-dec is the center declination in degrees. Together these specify a specific point of the sky. From here you can now use pos-rad to set a radius in degrees and        the search will limit itself to targets located within radius degrees of that point. 
         - Note: if only pos-rad is supplied the code will use the pos-ra and pos-dec corresponding to "target" (as long as there is an exact match within the database).                Additionally when doing this, the code will no longer filter based on target name. On the front end website this is achieved with the search around this target                option.   
      - Cadence search: Setting cadence = True causes it to combine all responses within the same cadence (to be described below) and adds a new 'cadence_url' part to the             entries containing the cadence-url as defined under api/get-cadence-url. On the front end it displays the cadence url in the place it would usually display the               normal url (which can still be accessed by opening up the entry)
        - Cadence definition: A cadence is defined to be a series of target searches looking something like ABACAD though partial cadences in the form of ABAC will also be             marked as cadences
        - Primary Target: If this is set the search will only return cadences where the target is the A of the cadence, rather than returning all cadences that the target is           a member of. 
    - Return Json:
      - 'result': either success or error
      - 'data': list of dictionaries, each with keys: 'target','target', 'telescope', 'utc', 'mjd', 'ra',
                                          'decl', 'center_freq', 'file_type', 'size', 'md5sum', 'url', 'cadence_url', 'tempX', 'tempY', 'minSize', 'maxSize', 'quality'
      - 'message': if the result was an error.
      
- Website
  - To use simply go to the URL listed at the top. Functions primarily as a user friendly wrapper for the api/query-files request
