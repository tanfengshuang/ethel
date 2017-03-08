import sys
import os
import logging
import logging.config

this_path = os.path.dirname(__file__)
sys.path.insert(0, this_path or '.')
sys.path.insert(0, os.path.join(this_path, 'wsgi'))

# Determine which database to use
if os.path.isfile(os.getcwd() + '/sqlite3.db'):
    os.environ['ETHEL_LOCAL_DB'] = 'true'

# Set up logging
logging_conf_file = "{0}/logging.conf".format(os.getcwd())
logging.config.fileConfig(logging_conf_file)
logging.root = logging.getLogger('DEBUG')

# Start the server
from ethel import app
logging.debug("Debug environment enabled!")
logging.info("[Starting] Account Tool Flask server...")
app.run(debug=True, threaded=True, port=8080)
