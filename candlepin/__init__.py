"""
Candlepin service package

Encapsluates whole Candlepin related operations - account management and
subscription attachements and refreshes.

Account:
- Create account
- Accept Terms and Conditions
- Get account details and information about attached pools
- Bind available pool for subscription with account

Subscription:
- Refresh available pools for account
- Create new pools for subscription
"""

import account
import subscription

__author__ = "tcoufal"

# REST API for Accounts
REST_BASE = "http://servicejava.edge.stage.ext.phx2.redhat.com/svcrest"
REST_USER = "{0}/user/v3".format(REST_BASE)
REST_REGNUM = "{0}/regnum/v5".format(REST_BASE)
REST_ACTIVATION = "{0}/activation/v2".format(REST_BASE)
REST_TERMS = "{0}/terms".format(REST_BASE)
REST_SUBSCRIPTIONS = "{0}/subscription/v5".format(REST_BASE)

# API for Subscriptions
STAGE_CANDLEPIN = "subscription.rhsm.stage.redhat.com"
REST_CANDLEPIN = "http://candlepin.dist.stage.ext.phx2.redhat.com/candlepin"
CANDLEPIN_USER = "candlepin_admin"
CANDLEPIN_PASSWORD = "candlepin_admin"

# JSONs feeded to API
USER_JSON_PATH = 'json/user.json'
ATTACH_SKU_PATH = 'json/attach_sku.json'

# Set retry limit
RETRY = 5

# Threads limit for fetching pool details
MAX_THREADS = 50
