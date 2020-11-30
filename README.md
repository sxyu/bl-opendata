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
                                          'decl', 'center_freq', 'file_type', 'size', 'md5sum', 'url'
      
  -Querry Files method details:
    -Argument List: target (required), telescopes (comma-sep), file-types (comma-sep), pos-ra, pos-dec, pos-rad, time-start, time-end, freq-start, freq-end, limit, cadence (boolean), grades (space-sep)

- Website
  - To use simply go to the URL listed at the top. Functions primarily as a user friendly wrapper for the api/query-files request
