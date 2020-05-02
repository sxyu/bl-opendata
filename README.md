# Breakthrough Listen Open Data Archive

- Based on Flask, MySQL
- `pip install -r requirements.txt` to get all dependencies
- Credit for the base code and features to https://github.com/sxyu/bl-opendata.

- Instructions
  - After installing the dependencies use call python3 run.py to run the program, make sure that you have a port forwarded for the website to work
  - There are two components to this program, the openData website and the backend API which are detailed below
  - Url for both website and API calls: http://seti.berkeley.edu:5000/
  
- API
  - The method descriptions are present as docstrings within core.py. A list of possible API requests: 
    - data/<path:filename>
    - api/list-targets
    - api/list-telescopes
    - api/list-file-types
    - api/query-files
    - api/get-cadence-url
    - api/get-cadence/<string:cadence_url>
  - Arguments for api/query-files
    - target (required), telescopes (comma-sep), file-types (comma-sep), pos-ra, pos-dec, pos-rad, time-start, time-end, freq-start, freq-end, limit, cadence (boolean), grades (space-sep)

- Website
  - To use simply go to the URL listed at the top. Functions primarily as a user friendly wrapper for the api/query-files request
