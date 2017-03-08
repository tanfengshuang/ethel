import logging
import requests
import json

import candlepin as env

__author__ = "tcoufal"


def activate_pool(username, org_id, regnum, start_date):
    """
    Attach a SKU registration number to an account

    Runs a request to the Candlepin REST API in order to hook the account
    specified by the 'username' and the 'org_id' with the activation
    key 'regnum'.

    :param username: Account's username
    :param org_id: Organization identifier for the given account
    :param regnum: The subscription pool's identifier
    :param start_data: A date by which the entitlement should be effective
    """
    logging.debug("Started to activate Registration number {0}".format(regnum))

    activation_info = {
        "activationKey": regnum,
        "vendor": "REDHAT",
        "startDate": str(start_date),
        "userName": username,
        "webCustomerId": org_id,
        "systemName": "genie"
    }

    for attempt in range(env.RETRY):
        try:
            r = requests.post('{0}/activate'.format(env.REST_ACTIVATION),
                              headers={'content-type': 'application/json'},
                              data=json.dumps(activation_info))
            r.raise_for_status()
        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("[Activate reg. number] Failed to active no. {0}:"
                          " {1}".format(regnum, e))
            continue

        if "Reg number product not active for SKU" in r.content:
            logging.error("[Activate reg. number] Failed to active no. {0}"
                          "".format(regnum))
            raise RuntimeError("Failed to active pool no. {0}".format(regnum))
        break
    else:
        logging.error("[Activate reg. number] out of retries")
        raise RuntimeError("Failed to active pool no. {0}".format(regnum))

    logging.info("[Activate reg. number] successful for no. {0}"
                 "".format(regnum))
    return True
