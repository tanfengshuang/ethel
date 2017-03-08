import os

__author__ = "ftan"
__update__ = "tcoufal"

# Database server
DB_HOST = os.environ.get(
    'OPENSHIFT_MYSQL_DB_HOST',
    '580683f95110e2175d000002-contentskuqe.itos.redhat.com'
)
DB_NAME = 'sku_db'
DB_USER = 'account_tool'
DB_PASSWORD = 'redhat'
DB_TABLE = 'sku_attributes_all'
DB_PORT = int(os.environ.get('OPENSHIFT_MYSQL_DB_PORT', 40466))

# Url to report bugs in this tool
REPORT_URL = (
    "https://engineering.redhat.com/trac/content-tests/newticket?component="
    "Stage+Account+Management+Tool&milestone=Account+Tool&type=account+tool+"
    "defect&cc=entitlement-qe@redhat.com"
)
REPORT_URL_CANDLEPIN = (
    "https://redhat.service-now.com/rh_ess/cat_item.do?&sysparm_document_key="
    "sc_cat_item,3f1dd0320a0a0b99000a53f7604a2ef9"
)
DOCUMENTATION_URL = \
    "https://engineering.redhat.com/trac/content-tests/wiki/Ethel"

# Specify Candlepin refresh date (default = empty)
# If there's a value set, warning is displayed in Ethel UI. Please use
# 'MM/DD/YYYY' format to maintain compatibility.
# NOTE: Restart server to take effect
CANDLEPIN_REFRESH_DATE = ''
